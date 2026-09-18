from datetime import timedelta

from temporalio import workflow

with workflow.unsafe.imports_passed_through():
    from activities import IncidentInput, apply_policy_update, apply_weight_update


@workflow.defn
class FeedbackLoopWorkflow:
    """
    Triggered whenever the evaluator or security service flags an incident
    (the "security incident" / "drift alert" edges in the architecture diagram).
    Runs both remediation activities durably — if one fails, Temporal retries it
    without re-running the other.
    """

    @workflow.run
    async def run(self, incident: IncidentInput) -> dict:
        policy_result = await workflow.execute_activity(
            apply_policy_update,
            incident,
            start_to_close_timeout=timedelta(seconds=30),
        )

        weight_result = await workflow.execute_activity(
            apply_weight_update,
            incident,
            start_to_close_timeout=timedelta(seconds=30),
        )

        return {"policy_result": policy_result, "weight_result": weight_result}
