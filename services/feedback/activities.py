"""
Activities the Feedback Loop Worker runs when it receives a security incident
or a drift alert. This is the "self-healing" part of the architecture.
"""
import os
from dataclasses import dataclass

import httpx
from qdrant_client import QdrantClient
from temporalio import activity

SECURITY_URL = os.getenv("SECURITY_URL", "http://localhost:8002")
QDRANT_URL = os.getenv("QDRANT_URL", "http://localhost:6333")
COLLECTION = os.getenv("QDRANT_COLLECTION", "rootline_grounding")


@dataclass
class IncidentInput:
    session_id: str
    incident_type: str  # "security_incident" | "drift_alert"
    detail: str
    severity: float  # 0-1


@activity.defn
async def apply_policy_update(incident: IncidentInput) -> str:
    """
    Placeholder for tightening Enkrypt policy thresholds after repeated incidents.
    Replace the internal logic with a real call into your Enkrypt policy management
    API (see enkryptai-sdk's `client.add_policy` / `client.modify_policy`) once you
    have production credentials.
    """
    activity.logger.info(f"Applying policy update for incident: {incident.incident_type}")

    async with httpx.AsyncClient() as client:
        try:
            # Example placeholder call — swap for your actual policy-update endpoint.
            resp = await client.post(
                f"{SECURITY_URL}/health",  # replace with a real /policy/update route once built
                timeout=5.0,
            )
            resp.raise_for_status()
        except Exception as e:
            activity.logger.warning(f"Policy update call failed (non-fatal): {e}")

    return f"policy_update_applied:{incident.incident_type}"


@activity.defn
async def apply_weight_update(incident: IncidentInput) -> str:
    """
    Placeholder for adjusting Qdrant retrieval behavior after repeated hallucination
    flags — e.g. re-weighting a collection's HNSW ef_search parameter for higher
    recall, or triggering a re-embedding job for stale documents.
    """
    activity.logger.info(f"Applying weight update for incident: {incident.incident_type}")

    client = QdrantClient(url=QDRANT_URL)
    try:
        client.update_collection(
            collection_name=COLLECTION,
            hnsw_config={"ef_construct": 150},  # example: widen search after repeated misses
        )
    except Exception as e:
        activity.logger.warning(f"Weight update failed (non-fatal): {e}")

    return f"weight_update_applied:{incident.incident_type}"
