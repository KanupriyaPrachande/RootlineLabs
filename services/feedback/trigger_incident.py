"""
Helper to trigger a feedback-loop workflow from the evaluator or security service
when they detect a security incident or drift alert.

Example usage from another service:
    from trigger_incident import trigger
    await trigger(session_id="abc123", incident_type="drift_alert",
                   detail="drift_score=0.82", severity=0.82)
"""
from temporalio.client import Client

from activities import IncidentInput
from workflows import FeedbackLoopWorkflow

TASK_QUEUE = "rootline-feedback-loop"


async def trigger(session_id: str, incident_type: str, detail: str, severity: float):
    client = await Client.connect("localhost:7233", namespace="default")
    incident = IncidentInput(
        session_id=session_id, incident_type=incident_type, detail=detail, severity=severity
    )
    handle = await client.start_workflow(
        FeedbackLoopWorkflow.run,
        incident,
        id=f"feedback-{session_id}-{incident_type}",
        task_queue=TASK_QUEUE,
    )
    return handle.id
