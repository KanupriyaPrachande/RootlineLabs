// Calls the Enkrypt Security service — the "pre-execution check" and
// "stream moderation" edges in the diagram.
const SECURITY_URL = process.env.SECURITY_URL || 'http://localhost:8002'

export interface SecurityResult {
  blocked: boolean
  injection_detected: boolean
  pii_detected: boolean
  pii_types: string[]
  reason?: string
  source: 'enkrypt_api' | 'local_fallback'
}

export async function securityCheck(params: {
  sessionId: string
  text: string
  stage: 'pre_execution' | 'stream_moderation'
}): Promise<SecurityResult> {
  const res = await fetch(`${SECURITY_URL}/check`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: params.sessionId, text: params.text, stage: params.stage }),
  })

  if (!res.ok) {
    // Fail closed on security checks — if the security service is down, block rather
    // than silently allow unchecked content through.
    return {
      blocked: true,
      injection_detected: false,
      pii_detected: false,
      pii_types: [],
      reason: 'security_service_unreachable',
      source: 'local_fallback',
    }
  }

  return (await res.json()) as SecurityResult
}
