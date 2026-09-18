// Calls the Moss Evaluator service — the "continuous eval" edge in the diagram.
const EVALUATOR_URL = process.env.EVALUATOR_URL || 'http://localhost:8001'

export interface EvalResult {
  drift_score: number
  hallucination_risk: number
  policy_aligned: boolean
  action: 'allow' | 'flag' | 'block'
  reason?: string
}

export async function evaluateTurn(params: {
  sessionId: string
  turnIndex: number
  originalTask: string
  conversationHistory: string[]
  latestResponse: string
}): Promise<EvalResult> {
  const res = await fetch(`${EVALUATOR_URL}/evaluate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      session_id: params.sessionId,
      turn_index: params.turnIndex,
      original_task: params.originalTask,
      conversation_history: params.conversationHistory,
      latest_response: params.latestResponse,
    }),
  })

  if (!res.ok) {
    // Fail open with a neutral "flag" result rather than crashing the whole request —
    // the feedback loop worker will still see this via tracing.
    return { drift_score: 0.5, hallucination_risk: 0.5, policy_aligned: false, action: 'flag', reason: 'evaluator_unreachable' }
  }

  return (await res.json()) as EvalResult
}
