"""
Seed Qdrant with facts about Rootline itself, so the agent has something real
to ground against during your demo. Uses Google's hosted text-embedding-004
API instead of a local model.

Usage (run from services/evaluator, after init_qdrant.py):
    python seed_data.py
"""
import os
import uuid

import httpx
from qdrant_client import QdrantClient
from qdrant_client.models import PointStruct

QDRANT_URL = os.getenv("QDRANT_URL", "http://localhost:6333")
COLLECTION = os.getenv("QDRANT_COLLECTION", "rootline_grounding")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

EMBED_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent"
client = QdrantClient(url=QDRANT_URL, api_key=os.getenv("QDRANT_API_KEY") or None)



def embed_text(text: str):
    """Truncated client-side to 768 dims (Matryoshka embeddings — the first
    N values are a valid embedding on their own)."""
    resp = httpx.post(
        f"{EMBED_URL}?key={GEMINI_API_KEY}",
        json={"model": "models/gemini-embedding-001", "content": {"parts": [{"text": text}]}},
        timeout=15.0,
    )
    resp.raise_for_status()
    return resp.json()["embedding"]["values"][:768]


DOCS = [
    "Rootline is a runtime trust layer for AI agents built on Mastra, Qdrant, and Enkrypt.",
    "The Mastra Orchestrator runs agent workflows and tool calls, and is the core agent runtime in Rootline.",
    "The Moss Evaluator continuously scores every agent turn for context drift and hallucination risk, "
    "not just at the start of a session.",
    "Every response in Rootline is grounded against a Qdrant vector database before it reaches the user, "
    "to reduce hallucination.",
    "Enkrypt Security inspects each step in real time for prompt injection attempts and PII leakage.",
    "All calls in Rootline are traced end-to-end using OpenTelemetry, giving visibility into latency at every hop.",
    "The Feedback Loop Worker, built on Temporal, automatically updates guardrail policies and retrieval "
    "weights when incidents are flagged, closing the loop between detection and prevention.",
    "Rootline differs from static guardrail tools because its guardrails adapt based on real incident "
    "history instead of relying on fixed, manually-written rules.",
    "Rootline solves the problem of AI agents failing silently: hallucinating facts, drifting off-task over "
    "long conversations, and being manipulated by prompt injection, all without anyone noticing until it "
    "is too late.",
    "Rootline is built for AI product teams deploying autonomous agents in production, security and "
    "compliance teams who need auditable guardrails, and platform engineers who need latency-aware tracing.",
    "Rootline supports real-time voice interaction through LiveKit. Speech is transcribed in the browser "
    "and routed through the exact same security, grounding, and evaluation pipeline as typed text, so voice "
    "gets identical trust guarantees.",
    "The frontend client in Rootline is built with Next.js and React, and communicates with the orchestrator "
    "over HTTP.",
    "The Mastra Orchestrator, Moss Evaluator, and Enkrypt Security services communicate with each other over "
    "HTTP APIs, forming an independent multi-service architecture.",
    "Rootline's orchestrator applies rate limiting and input validation on every request to guard against "
    "abuse, in line with OWASP API security recommendations.",
    "Rootline provides a session-erasure endpoint so a user's conversation history can be deleted on request, "
    "supporting GDPR-style right-to-erasure for conversational data.",
    "In Rootline, a drift score measures how far the current conversation has moved away from the user's "
    "original stated task or intent.",
    "In Rootline, a hallucination risk score measures how well an agent's response is supported by facts "
    "found in the Qdrant grounding database; a high score means the claim could not be verified.",
    "Rootline's evaluator can take three actions on a response: allow it, flag it for review while still "
    "answering, or block it entirely when both drift and hallucination risk are high.",
    "Rootline was built for the YC Fall 2026 x Moss hackathon, under the challenge track Agent Reliability, "
    "Security and Evaluation.",
    "Rootline aims for a low-latency evaluation loop across its pipeline stages, so trust and safety checks "
    "do not add significant delay to an agent's response.",
]


def seed():
    if not client.collection_exists(COLLECTION):
        raise RuntimeError(f"Collection '{COLLECTION}' doesn't exist yet — run init_qdrant.py first.")

    points = []
    for doc in DOCS:
        vec = embed_text(doc)
        points.append(PointStruct(id=str(uuid.uuid4()), vector=vec, payload={"text": doc}))

    client.upsert(collection_name=COLLECTION, points=points)
    print(f"Seeded {len(points)} documents into '{COLLECTION}'.")


if __name__ == "__main__":
    seed()
