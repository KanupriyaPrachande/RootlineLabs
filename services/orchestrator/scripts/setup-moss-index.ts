import { MossClient } from '@moss-dev/moss'
import 'dotenv/config'

const MOSS_PROJECT_ID = process.env.MOSS_PROJECT_ID!
const MOSS_PROJECT_KEY = process.env.MOSS_PROJECT_KEY!

const DOCS = [
  { id: '1', text: 'Rootline is a runtime trust layer for AI agents built on Mastra, Moss, and Enkrypt.' },
  { id: '2', text: 'The Mastra Orchestrator runs agent workflows and tool calls, and is the core agent runtime in Rootline.' },
  { id: '3', text: 'The Moss Evaluator continuously scores every agent turn for context drift and hallucination risk, not just at the start of a session.' },
  { id: '4', text: 'Every response in Rootline is grounded against a Moss retrieval index before it reaches the user, to reduce hallucination.' },
  { id: '5', text: 'Enkrypt Security inspects each step in real time for prompt injection attempts and PII leakage.' },
  { id: '6', text: 'All calls in Rootline are traced end-to-end using OpenTelemetry, giving visibility into latency at every hop.' },
  { id: '7', text: 'The Feedback Loop Worker, built on Temporal, automatically updates guardrail policies and retrieval weights when incidents are flagged, closing the loop between detection and prevention.' },
  { id: '8', text: 'Rootline differs from static guardrail tools because its guardrails adapt based on real incident history instead of relying on fixed, manually-written rules.' },
  { id: '9', text: 'Rootline solves the problem of AI agents failing silently: hallucinating facts, drifting off-task over long conversations, and being manipulated by prompt injection, all without anyone noticing until it is too late.' },
  { id: '10', text: 'Rootline is built for AI product teams deploying autonomous agents in production, security and compliance teams who need auditable guardrails, and platform engineers who need latency-aware tracing.' },
  { id: '11', text: 'Rootline supports real-time voice interaction through LiveKit. Speech is transcribed in the browser and routed through the exact same security, grounding, and evaluation pipeline as typed text, so voice gets identical trust guarantees.' },
  { id: '12', text: 'The frontend client in Rootline is built with Next.js and React, and communicates with the orchestrator over HTTP.' },
  { id: '13', text: 'The Mastra Orchestrator, Moss Evaluator, and Enkrypt Security services communicate with each other over HTTP APIs, forming an independent multi-service architecture.' },
  { id: '14', text: 'Rootline\'s orchestrator applies rate limiting and input validation on every request to guard against abuse, in line with OWASP API security recommendations.' },
  { id: '15', text: 'Rootline provides a session-erasure endpoint so a user\'s conversation history can be deleted on request, supporting GDPR-style right-to-erasure for conversational data.' },
  { id: '16', text: 'In Rootline, a drift score measures how far the current conversation has moved away from the user\'s original stated task or intent.' },
  { id: '17', text: 'In Rootline, a hallucination risk score measures how well an agent\'s response is supported by facts found in the Moss grounding index; a high score means the claim could not be verified.' },
  { id: '18', text: 'Rootline\'s evaluator can take three actions on a response: allow it, flag it for review while still answering, or block it entirely when both drift and hallucination risk are high.' },
  { id: '19', text: 'Rootline was built for the YC Fall 2026 x Moss hackathon, under the challenge track Agent Reliability, Security and Evaluation.' },
  { id: '20', text: 'Rootline achieves a low-latency evaluation loop across its pipeline stages by keeping retrieval in-process with Moss, so trust and safety checks do not add significant delay to an agent\'s response.' },
]

async function main() {
  const client = new MossClient(MOSS_PROJECT_ID, MOSS_PROJECT_KEY)
  await client.createIndex('rootline-grounding', DOCS)
  console.log(`Moss index "rootline-grounding" seeded with ${DOCS.length} real documents.`)
}

main().catch((err) => {
  console.error('Failed to set up Moss index:', err)
  process.exit(1)
})
