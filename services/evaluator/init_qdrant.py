"""
Run once to create the Qdrant grounding collection with HNSW indexing.

Usage:
    python init_qdrant.py
"""
import os
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, HnswConfigDiff

QDRANT_URL = os.getenv("QDRANT_URL", "http://localhost:6333")
COLLECTION = os.getenv("QDRANT_COLLECTION", "rootline_grounding")

VECTOR_SIZE = 384  # matches sentence-transformers/all-MiniLM-L6-v2, used by the evaluator
  # matches OpenAI text-embedding-3-small; change if using another embedder

client = QdrantClient(url=QDRANT_URL)

if client.collection_exists(COLLECTION):
    print(f"Collection '{COLLECTION}' already exists — skipping creation.")
else:
    client.create_collection(
        collection_name=COLLECTION,
        vectors_config=VectorParams(size=VECTOR_SIZE, distance=Distance.COSINE),
        hnsw_config=HnswConfigDiff(m=16, ef_construct=100),
    )
    print(f"Created collection '{COLLECTION}' with HNSW (m=16, ef_construct=100).")
