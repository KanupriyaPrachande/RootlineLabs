"""
Seed Qdrant with a handful of facts about Rootline itself, so the agent has
something real to ground against during your demo.

Usage (run from services/evaluator, after init_qdrant.py):
    python seed_data.py
"""
import os
import uuid

from qdrant_client import QdrantClient
from qdrant_client.models import PointStruct
from sentence_transformers import SentenceTransformer

QDRANT_URL = os.getenv("QDRANT_URL", "http://localhost:6333")
COLLECTION = os.getenv("QDRANT_COLLECTION", "rootline_grounding")

embedder = SentenceTransformer("all-MiniLM-L6-v2")
client = QdrantClient(url=QDRANT_URL)

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
]


def seed():
    if not client.collection_exists(COLLECTION):
        raise RuntimeError(f"Collection '{COLLECTION}' doesn't exist yet — run init_qdrant.py first.")

    vectors = embedder.encode(DOCS).tolist()
    points = [
        PointStruct(id=str(uuid.uuid4()), vector=vec, payload={"text": doc})
        for doc, vec in zip(DOCS, vectors)
    ]

    client.upsert(collection_name=COLLECTION, points=points)
    print(f"Seeded {len(points)} documents into '{COLLECTION}'.")


if __name__ == "__main__":
    seed()