import './tracing.ts' // MUST be the first import — sets up OTel before anything else loads

import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { trace } from '@opentelemetry/api'
import { mastra } from './mastra/index.ts'
import { evaluateTurn } from './clients/evaluatorClient.ts'
import { securityCheck } from './clients/securityClient.ts'
import { createLiveKitToken } from './clients/livekitClient.ts'

const app = express()
app.use(cors())
app.use(express.json())
const tracer = trace.getTracer('rootline-orchestrator')

// In-memory session store — swap for Redis/Postgres before production.
interface Session {
  originalTask: string
  history: string[]
}
const sessions = new Map<string, Session>()

app.post('/chat', async (req, res) => {
  const { sessionId, message } = req.body as { sessionId: string; message: string }

  if (!sessionId || !message) {
    return res.status(400).json({ error: 'sessionId and message are required' })
  }

  return tracer.startActiveSpan('rootline.chat_turn', async (span) => {
    try {
      const session = sessions.get(sessionId) ?? { originalTask: message, history: [] }
      if (!sessions.has(sessionId)) sessions.set(sessionId, session)

      // --- 1. pre-execution check (Enkrypt) ---
      const preCheck = await tracer.startActiveSpan('pre_execution_check', async (s) => {
        const result = await securityCheck({ sessionId, text: message, stage: 'pre_execution' })
        s.end()
        return result
      })

      if (preCheck.blocked) {
        span.end()
        return res.status(403).json({
          error: 'Request blocked by security layer',
          reason: preCheck.reason,
          source: preCheck.source,
        })
      }

      // --- 2. run the agent (Mastra Orchestrator → LLM Provider) ---
      const agent = mastra.getAgentById('rootline-agent')
      const agentResponse = await tracer.startActiveSpan('agent_generate', async (s) => {
        const r = await agent.generate(message)
        s.end()
        return r
      })
      const responseText = agentResponse.text

      // --- 3. stream/output moderation (Enkrypt) ---
      const postCheck = await tracer.startActiveSpan('stream_moderation', async (s) => {
        const result = await securityCheck({ sessionId, text: responseText, stage: 'stream_moderation' })
        s.end()
        return result
      })

      if (postCheck.blocked) {
        span.end()
        return res.status(403).json({
          error: 'Response blocked by security layer before delivery',
          reason: postCheck.reason,
        })
      }

      // --- 4. continuous evaluation (Moss Evaluator, grounding via Qdrant happens inside it) ---
      session.history.push(message, responseText)
      const evalResult = await tracer.startActiveSpan('continuous_eval', async (s) => {
        const r = await evaluateTurn({
          sessionId,
          turnIndex: session.history.length,
          originalTask: session.originalTask,
          conversationHistory: session.history,
          latestResponse: responseText,
        })
        s.end()
        return r
      })

      // --- 5. act on the trust score ---
      if (evalResult.action === 'block') {
        span.end()
        return res.status(422).json({
          error: 'Response blocked — high drift/hallucination risk',
          eval: evalResult,
        })
      }

      // "flag" results still return to the user, but get surfaced for the feedback loop.
      // In production, publish evalResult to a queue/Temporal signal here instead of just logging.
      if (evalResult.action === 'flag') {
        console.warn(`[flagged] session=${sessionId} reason=${evalResult.reason}`)
      }

      span.end()
      return res.json({
        response: responseText,
        trust: {
          drift_score: evalResult.drift_score,
          hallucination_risk: evalResult.hallucination_risk,
          action: evalResult.action,
        },
      })
    } catch (err) {
      span.recordException(err as Error)
      span.end()
      console.error(err)
      return res.status(500).json({ error: 'Internal error in orchestrator pipeline' })
    }
  })
})
app.post('/livekit/token', async (req, res) => {
  const { sessionId } = req.body as { sessionId?: string }
  if (!sessionId) return res.status(400).json({ error: 'sessionId is required' })

  try {
    const roomName = `rootline-${sessionId}`
    const jwt = await createLiveKitToken(roomName, sessionId)
    return res.json({ token: jwt, room: roomName, url: process.env.LIVEKIT_URL })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Could not create LiveKit token', detail: (err as Error).message })
  }
})
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'rootline-orchestrator' }))

const PORT = process.env.PORT || 4111
app.listen(PORT, () => {
  console.log(`Rootline orchestrator listening on http://localhost:${PORT}`)
})
