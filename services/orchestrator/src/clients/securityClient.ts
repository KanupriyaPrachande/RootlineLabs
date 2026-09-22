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
  try {
    const res = await fetch(`${SECURITY_URL}/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: params.sessionId, text: params.text, stage: params.stage }),
    })

    if (!res.ok) {
      console.error(`[securityCheck] non-OK response: ${res.status} ${res.statusText} from ${SECURITY_URL}`)
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
  } catch (err) {
    console.error(`[securityCheck] fetch threw for ${SECURITY_URL}:`, err)
    return {
      blocked: true,
      injection_detected: false,
      pii_detected: false,
      pii_types: [],
      reason: 'security_service_unreachable',
      source: 'local_fallback',
    }
  }
}