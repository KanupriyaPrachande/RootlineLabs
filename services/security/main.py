"""
Enkrypt Security — real-time prompt injection and PII detection.

Called by the Mastra Orchestrator at two points (per the architecture diagram):
  - "pre-execution check": before a tool call or LLM call is allowed to run
  - "stream moderation": while output is streaming back to the user

Uses the real `enkryptai-sdk` package when ENKRYPT_API_KEY is set. If it isn't set
(e.g. you're still waiting on API access), falls back to a local regex-based stub
so the rest of the pipeline still runs end-to-end during development.
"""
import os
import re
from typing import Optional

from fastapi import FastAPI
from pydantic import BaseModel

from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor

otlp_endpoint = os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT", "http://localhost:4318")
provider = TracerProvider()
provider.add_span_processor(
    BatchSpanProcessor(OTLPSpanExporter(endpoint=f"{otlp_endpoint}/v1/traces"))
)
trace.set_tracer_provider(provider)
tracer = trace.get_tracer("enkrypt-security")

app = FastAPI(title="Enkrypt Security")
FastAPIInstrumentor.instrument_app(app)

ENKRYPT_API_KEY = os.getenv("ENKRYPT_API_KEY", "").strip()

# ---- Real Enkrypt SDK client (only initialized if a key is present) ----
_enkrypt_client = None
_injection_config = None
if ENKRYPT_API_KEY:
    from enkryptai_sdk import GuardrailsClient, GuardrailsConfig  # pip install enkryptai-sdk

    _enkrypt_client = GuardrailsClient(api_key=ENKRYPT_API_KEY)
    _injection_config = GuardrailsConfig.injection_attack()

# ---- Local fallback (used when no API key is configured yet) ----
_INJECTION_PATTERNS = [
    r"ignore (all|previous|prior) instructions",
    r"disregard (the|your) (system|previous) prompt",
    r"you are now",
    r"forget (all|everything) (you were|above)",
    r"reveal your (system prompt|instructions)",
]
_PII_PATTERNS = {
    "email": r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}",
    "ssn": r"\b\d{3}-\d{2}-\d{4}\b",
    "phone": r"\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b",
    "credit_card": r"\b(?:\d[ -]*?){13,16}\b",
}


class CheckRequest(BaseModel):
    session_id: str
    text: str
    stage: str  # "pre_execution" | "stream_moderation"


class CheckResponse(BaseModel):
    blocked: bool
    injection_detected: bool
    pii_detected: bool
    pii_types: list[str]
    reason: Optional[str] = None
    source: str  # "enkrypt_api" | "local_fallback"


def _check_with_enkrypt(text: str) -> CheckResponse:
    result = _enkrypt_client.detect(text=text, config=_injection_config)
    # NOTE: exact response shape depends on your enkryptai-sdk version — check
    # `response.summary` / `response.details` in your installed version and adjust
    # the two lines below if the SDK's field names differ.
    injection_detected = bool(getattr(result, "is_injection", False) or getattr(result, "detected", False))
    return CheckResponse(
        blocked=injection_detected,
        injection_detected=injection_detected,
        pii_detected=False,  # add a separate GuardrailsConfig for PII if your plan includes it
        pii_types=[],
        reason="Injection attack detected by Enkrypt API." if injection_detected else None,
        source="enkrypt_api",
    )


def _check_local_fallback(text: str) -> CheckResponse:
    lowered = text.lower()
    injection_detected = any(re.search(p, lowered) for p in _INJECTION_PATTERNS)

    pii_types = [name for name, pattern in _PII_PATTERNS.items() if re.search(pattern, text)]
    pii_detected = len(pii_types) > 0

    blocked = injection_detected  # PII gets redacted upstream rather than hard-blocked
    reason = None
    if injection_detected:
        reason = "Local heuristic matched a known prompt-injection pattern."
    elif pii_detected:
        reason = f"PII detected: {', '.join(pii_types)}"

    return CheckResponse(
        blocked=blocked,
        injection_detected=injection_detected,
        pii_detected=pii_detected,
        pii_types=pii_types,
        reason=reason,
        source="local_fallback",
    )


@app.post("/check", response_model=CheckResponse)
def check(req: CheckRequest):
    with tracer.start_as_current_span(f"enkrypt.check.{req.stage}"):
        if _enkrypt_client is not None:
            try:
                return _check_with_enkrypt(req.text)
            except Exception:
                # never let a security-service hiccup take down the whole pipeline —
                # fall back locally and let the feedback loop flag it for review
                return _check_local_fallback(req.text)
        return _check_local_fallback(req.text)


@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "enkrypt-security",
        "mode": "enkrypt_api" if _enkrypt_client else "local_fallback",
    }
