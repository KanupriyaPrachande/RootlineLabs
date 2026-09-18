"""
Feedback Loop Worker — run this alongside a Temporal server.

If you don't have a Temporal server running yet:
    brew install temporal   # or see https://docs.temporal.io/cli
    temporal server start-dev

Then in a separate terminal:
    python worker.py
"""
import asyncio

from temporalio.client import Client
from temporalio.worker import Worker

from activities import apply_policy_update, apply_weight_update
from workflows import FeedbackLoopWorkflow

TASK_QUEUE = "rootline-feedback-loop"


async def main():
    client = await Client.connect("localhost:7233", namespace="default")
    worker = Worker(
        client,
        task_queue=TASK_QUEUE,
        workflows=[FeedbackLoopWorkflow],
        activities=[apply_policy_update, apply_weight_update],
    )
    print(f"Feedback Loop Worker listening on task queue '{TASK_QUEUE}'...")
    await worker.run()


if __name__ == "__main__":
    asyncio.run(main())
