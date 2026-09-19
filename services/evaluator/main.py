"""
Moss Evaluator — continuous context evaluation for drift, hallucination risk, and policy.

Called by the Mastra Orchestrator after every agent turn (the "continuous eval" edge
in the architecture diagram). Returns a trust score the orchestrator can act on.

Embeddings for drift detection are generated via Google's hosted text-embedding-004 API.
Grounding/hallucination checks are powered by Moss, an embedded retrieval runtime with
sub-10ms query latency — no separate vector database or network hop required.
"""
import os
from typing import List, Optional

import httpx
import numpy as np
from fastapi import FastAPI
from pydantic import BaseModel
from moss import MossClient, QueryOptions

from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor

# ---- OpenTelemetry setup (traces this service as one hop in the pipeline) ----
otlp_endpoint = os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT", "http://localhost:4318")
provider = TracerProvider()
provider.add_span_processor(
    BatchSpanProcessor(OTLPSpanExporter(endpoint=f"{otlp_endpoint}/v1/traces"))
)
trace.set_tracer_provider(provider)
tracer = trace.get_tracer("moss-evaluator")

app = FastAPI(title="Moss Evaluator")
FastAPIInstrumentor.instrument_app(app)

# ---- Hosted embeddings (Google text-embedding-004, 768-dim, free tier) ----
# Used only for drift detection (comparing arbitrary turns to each other).
# Grounding/hallucination checks use Moss's own built-in embeddings instead.
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
EMBED_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent"


def embed_text(text: str) -> np.ndarray:
    """Get a single embedding vector from Google's hosted embedding API.
    Truncated client-side to 768 dims — Gemini embeddings use Matryoshka
    learning, so the first N values are a valid embedding on their own,
    which is more reliable than the API's own truncation parameter."""
    resp = httpx.post(
        f"{EMBED_URL}?key={GEMINI_API_KEY}",
        json={"model": "models/gemini-embedding-001", "content": {"parts": [{"text": text}]}},
        timeout=15.0,
    )
    resp.raise_for_status()
    values = resp.json()["embedding"]["values"]
    return np.array(values[:768])


# ---- Moss (grounding / hallucination-check retrieval) ----
moss_client = MossClient(os.getenv("MOSS_PROJECT_ID", ""), os.getenv("MOSS_PROJECT_KEY", ""))
MOSS_INDEX = "rootline-grounding"
_moss_index_loaded = False


async def ensure_moss_loaded():
    global _moss_index_loaded
    if not _moss_index_loaded:
        await moss_client.load_index(MOSS_INDEX)
        _moss_index_loaded = True


DRIFT_WINDOW = 5  # how many prior turns to compare against for drift detection


class EvalRequest(BaseModel):
    session_id: str
    turn_index: int
    original_task: str
    conversation_history: List[str]
    latest_response: str


class EvalResponse(BaseModel):
    drift_score: float
    hallucination_risk: float
    policy_aligned: bool
    action: str
    reason: Optional[str] = None


class GroundRequest(BaseModel):
    query: str
    top_k: int = 3


class GroundMatch(BaseModel):
    text: str
    score: float


class GroundResponse(BaseModel):
    matches: List[GroundMatch]


def cosine_sim(a: np.ndarray, b: np.ndarray) -> float:
    return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b) + 1e-8))

def compute_drift(original_task: str, recent_turns: List[str]) -> float:
    """Drift = how far recent turns have moved from the original stated task."""
    if not recent_turns:
        return 0.0
    try:
        task_vec = embed_text(original_task)
        sims = [cosine_sim(task_vec, embed_text(t)) for t in recent_turns]
    except Exception as e:
        print(f"[compute_drift] embedding failed, defaulting to neutral drift: {e}")
        return 0.3
    avg_sim = float(np.mean(sims))
    return max(0.0, 1.0 - avg_sim)


async def compute_hallucination_risk(response: str, top_k: int = 3) -> float:
    """Grounding check: search Moss for supporting context; low similarity = high risk."""
    try:
        await ensure_moss_loaded()
        results = await moss_client.query(MOSS_INDEX, response, QueryOptions(top_k=top_k))
        hits = results.docs
    except Exception as e:
        print(f"[compute_hallucination_risk] failed: {e}")
        return 0.5

    if not hits:
        return 1.0
    best_score = max(h.score for h in hits)
    return max(0.0, 1.0 - best_score)


@app.post("/evaluate", response_model=EvalResponse)
async def evaluate(req: EvalRequest):
    with tracer.start_as_current_span("moss.evaluate"):
        recent = req.conversation_history[-DRIFT_WINDOW:]
        drift = compute_drift(req.original_task, recent)
        hallucination = await compute_hallucination_risk(req.latest_response)

        policy_aligned = drift < 0.6 and hallucination < 0.7

        if (drift > 0.85 and hallucination > 0.6) or hallucination > 0.9:
            action = "block"
            reason = "High-confidence unverified claim combined with significant topic drift."
        elif drift > 0.5 or hallucination > 0.6:
            action = "flag"
            reason = "Moderate drift/hallucination risk — flagged for review and feedback loop."
        else:
            action = "allow"
            reason = None

        return EvalResponse(
            drift_score=round(drift, 3),
            hallucination_risk=round(hallucination, 3),
            policy_aligned=policy_aligned,
            action=action,
            reason=reason,
        )


@app.get("/health")
def health():
    return {"status": "ok", "service": "moss-evaluator"}


@app.post("/ground", response_model=GroundResponse)
async def ground(req: GroundRequest):
    """
    Text-in, matches-out grounding lookup — used by the Mastra Orchestrator's
    grounding tool.
    """
    with tracer.start_as_current_span("moss.ground"):
        try:
            await ensure_moss_loaded()
            results = await moss_client.query(MOSS_INDEX, req.query, QueryOptions(top_k=req.top_k))
        except Exception as e:
            print(f"[ground] failed: {e}")
            return GroundResponse(matches=[])

        return GroundResponse(
            matches=[GroundMatch(text=d.text, score=d.score) for d in results.docs]
        )
