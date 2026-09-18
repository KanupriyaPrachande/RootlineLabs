'use client'

import { useState } from 'react'
import VoiceChat from './VoiceChat'

const ORCHESTRATOR_URL = process.env.NEXT_PUBLIC_ORCHESTRATOR_URL || 'http://localhost:4111'

interface Trust {
  drift_score: number
  hallucination_risk: number
  action: 'allow' | 'flag' | 'block'
}

interface Message {
  role: 'user' | 'assistant'
  text: string
  trust?: Trust
  blocked?: boolean
  reason?: string
}

const STAGES = [
  { key: 'security', label: 'Security' },
  { key: 'agent', label: 'Agent' },
  { key: 'ground', label: 'Ground' },
  { key: 'moderate', label: 'Security' },
  { key: 'eval', label: 'Eval' },
] as const

const COLOR = {
  moss: '#8FBF6A',
  amber: '#E8B84B',
  clay: '#E06B5F',
  dim: '#4A4F48',
  text: '#FFFFFF',
  faint: 'rgba(255,255,255,0.65)',
}

function actionColor(action?: string) {
  if (action === 'block') return COLOR.clay
  if (action === 'flag') return COLOR.amber
  return COLOR.moss
}

function Meter({ value, color }: { value: number; color: string }) {
  return (
    <div style={{ width: 90, height: 6, background: 'rgba(255,255,255,0.12)', position: 'relative' }}>
      <div
        style={{
          width: `${Math.min(100, Math.max(0, value * 100))}%`,
          height: '100%',
          background: color,
          transition: 'width 400ms ease',
        }}
      />
    </div>
  )
}

function PipelinePulse({ activeStage, resultColor }: { activeStage: number; resultColor: string | null }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 2, marginTop: 36, marginBottom: 16 }}>
      {STAGES.map((stage, i) => {
        const isActive = i === activeStage
        const isPast = activeStage > i || (activeStage === -1 && resultColor)
        const dotColor = isActive ? '#FFFFFF' : isPast ? resultColor ?? COLOR.moss : COLOR.dim
        return (
          <div key={stage.key + i} style={{ display: 'flex', alignItems: 'center', flex: i < STAGES.length - 1 ? 1 : 'initial' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: '50%',
                  background: dotColor,
                  boxShadow: isActive ? `0 0 0 6px rgba(255,255,255,0.15)` : 'none',
                  transition: 'all 300ms ease',
                }}
              />
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 15,
                  letterSpacing: '0.02em',
                  color: isActive ? COLOR.text : COLOR.faint,
                }}
              >
                {stage.label}
              </span>
            </div>
            {i < STAGES.length - 1 && (
              <div
                style={{
                  flex: 1,
                  height: 2,
                  background: isPast ? (resultColor ?? COLOR.moss) : COLOR.dim,
                  marginBottom: 26,
                  transition: 'background 300ms ease',
                }}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function ChatPage() {
  const [sessionId] = useState(() => crypto.randomUUID())
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [activeStage, setActiveStage] = useState(-1)
  const [lastResultColor, setLastResultColor] = useState<string | null>(null)

  async function runPipelineAnimation() {
    for (let i = 0; i < STAGES.length; i++) {
      setActiveStage(i)
      await new Promise((r) => setTimeout(r, 220))
    }
  }

  async function sendMessage() {
    if (!input.trim()) return
    const userMessage: Message = { role: 'user', text: input }
    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setLoading(true)
    setLastResultColor(null)
    runPipelineAnimation()

    try {
      const res = await fetch(`${ORCHESTRATOR_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, message: userMessage.text }),
      })
      const data = await res.json()

      if (!res.ok) {
        setLastResultColor(COLOR.clay)
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', text: data.error ?? 'Request failed', reason: data.reason, blocked: true },
        ])
      } else {
        setLastResultColor(actionColor(data.trust?.action))
        setMessages((prev) => [...prev, { role: 'assistant', text: data.response, trust: data.trust }])
      }
    } catch (e) {
      setLastResultColor(COLOR.clay)
      setMessages((prev) => [...prev, { role: 'assistant', text: 'Could not reach orchestrator.', blocked: true }])
    } finally {
      setLoading(false)
      setActiveStage(-1)
    }
  }

  return (
    <main style={{ width: '100%', minHeight: '100vh', maxWidth: 900, margin: '0 auto', padding: '56px 32px 48px', boxSizing: 'border-box' }}>
      <header>
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 500,
            fontSize: 64,
            margin: 0,
            letterSpacing: '-0.01em',
            display: 'flex',
            alignItems: 'baseline',
            gap: 14,
            color: COLOR.text,
          }}
        >
          Rootline
          <span style={{ width: 14, height: 14, borderRadius: '50%', background: COLOR.moss, display: 'inline-block' }} />
        </h1>
        <p style={{ color: COLOR.faint, marginTop: 10, fontSize: 20 }}>
          A runtime trust layer that watches every turn of every conversation — not just the first prompt.
        </p>
      </header>

      <PipelinePulse activeStage={activeStage} resultColor={lastResultColor} />

      <section
        style={{
          borderTop: '1px solid rgba(255,255,255,0.18)',
          paddingTop: 28,
          minHeight: 380,
          display: 'flex',
          flexDirection: 'column',
          gap: 26,
        }}
      >
        {messages.length === 0 && (
          <p style={{ color: COLOR.faint, fontSize: 18, fontStyle: 'italic' }}>
            Ask something grounded, or something it can&apos;t know — either way, watch the pipeline above.
          </p>
        )}

        {messages.map((m, i) =>
          m.role === 'user' ? (
            <div key={i} style={{ textAlign: 'right' }}>
              <p style={{ margin: 0, fontSize: 20, color: COLOR.text }}>{m.text}</p>
            </div>
          ) : (
            <div
              key={i}
              style={{
                borderLeft: `3px solid ${m.blocked ? COLOR.clay : actionColor(m.trust?.action)}`,
                paddingLeft: 20,
              }}
            >
              <p style={{ margin: 0, fontSize: 20, lineHeight: 1.65, color: COLOR.text }}>{m.text}</p>
              {m.reason && (
                <p style={{ margin: '8px 0 0', fontSize: 15, color: COLOR.faint, fontFamily: 'var(--font-mono)' }}>
                  {m.reason}
                </p>
              )}
              {m.trust && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginTop: 14, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: COLOR.faint }}>drift</span>
                    <Meter value={m.trust.drift_score} color={COLOR.amber} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: COLOR.faint }}>risk</span>
                    <Meter value={m.trust.hallucination_risk} color={COLOR.clay} />
                  </div>
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 14,
                      fontWeight: 600,
                      color: actionColor(m.trust.action),
                      marginLeft: 'auto',
                    }}
                  >
                    {m.trust.action}
                  </span>
                </div>
              )}
            </div>
          )
        )}

        {loading && (
          <div style={{ borderLeft: `3px solid ${COLOR.dim}`, paddingLeft: 20 }}>
            <p style={{ margin: 0, fontSize: 18, color: COLOR.faint, fontFamily: 'var(--font-mono)' }}>
              {STAGES[Math.max(activeStage, 0)]?.label.toLowerCase()}…
            </p>
          </div>
        )}
      </section>

      <div style={{ display: 'flex', gap: 12, marginTop: 32 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Ask something…"
          style={{
            flex: 1,
            padding: '16px 18px',
            background: 'transparent',
            border: '1px solid rgba(255,255,255,0.25)',
            color: COLOR.text,
            fontSize: 18,
            outline: 'none',
          }}
        />
        <button
          onClick={sendMessage}
          style={{
            padding: '16px 28px',
            background: COLOR.moss,
            color: '#0A0D0A',
            border: 'none',
            fontSize: 18,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Send
        </button>
      </div>

      <VoiceChat
        sessionId={sessionId}
        onTranscript={(text) => setMessages((prev) => [...prev, { role: 'user', text }])}
        onResponse={(text, trust) => {
          setLastResultColor(actionColor(trust?.action))
          setMessages((prev) => [...prev, { role: 'assistant', text, trust }])
        }}
      />
    </main>
  )
}
