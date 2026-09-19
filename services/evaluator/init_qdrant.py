"""
Run once to create the Qdrant grounding collection with HNSW indexing.
Vector size 768 matches Google's text-embedding-004 model.

Usage:
    python init_qdrant.py
"""
import os
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, HnswConfigDiff

QDRANT_URL = os.getenv("QDRANT_URL", "http://localhost:6333")
COLLECTION = os.getenv("QDRANT_COLLECTION", "rootline_grounding")
VECTOR_SIZE = 768  # matches Google text-embedding-004

client = QdrantClient(url=QDRANT_URL, api_key=os.getenv("QDRANT_API_KEY") or None)

if client.collection_exists(COLLECTION):
    print(f"Deleting existing collection '{COLLECTION}' (dimension may not match new embedder)...")
    client.delete_collection(COLLECTION)

client.create_collection(
    collection_name=COLLECTION,
    vectors_config=VectorParams(size=VECTOR_SIZE, distance=Distance.COSINE),
    hnsw_config=HnswConfigDiff(m=16, ef_construct=100),
)
print(f"Created collection '{COLLECTION}' with HNSW (m=16, ef_construct=100), vector size {VECTOR_SIZE}.")
