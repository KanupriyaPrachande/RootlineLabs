'use client'

import { useRef, useState } from 'react'
import { Room, RoomEvent } from 'livekit-client'

const ORCHESTRATOR_URL = process.env.NEXT_PUBLIC_ORCHESTRATOR_URL || 'http://localhost:4111'


interface VoiceChatProps {
  sessionId: string
  onTranscript: (text: string) => void
  onResponse: (
    text: string,
    trust?: { drift_score: number; hallucination_risk: number; action: 'allow' | 'flag' | 'block' }
  ) => void
}

declare global {
  interface Window {
    webkitSpeechRecognition?: any
    SpeechRecognition?: any
  }
}

const btnBase: React.CSSProperties = {
  padding: '14px 22px',
  fontSize: 15,
  fontFamily: 'var(--font-mono)',
  border: '1px solid rgba(255,255,255,0.22)',
  background: 'transparent',
  color: '#FFFFFF',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 10,
}

export default function VoiceChat({ sessionId, onTranscript, onResponse }: VoiceChatProps) {
  const [connected, setConnected] = useState(false)
  const [listening, setListening] = useState(false)
  const roomRef = useRef<Room | null>(null)
  const recognitionRef = useRef<any>(null)

  async function connect() {
    try {
      const res = await fetch(`${ORCHESTRATOR_URL}/livekit/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      })
      if (!res.ok) {
        const err = await res.json()
        alert(`LiveKit not configured: ${err.error ?? 'unknown error'}. Set LIVEKIT_API_KEY/SECRET/URL in orchestrator .env.`)
        return
      }
      const { token, url } = await res.json()

      const room = new Room()
      room.on(RoomEvent.Disconnected, () => setConnected(false))
      await room.connect(url, token)
      await room.localParticipant.setMicrophoneEnabled(true)

      roomRef.current = room
      setConnected(true)
    } catch (e) {
      console.error(e)
      alert('Could not connect to LiveKit room — check LIVEKIT_URL/keys and that your LiveKit project is reachable.')
    }
  }

  function disconnect() {
    roomRef.current?.disconnect()
    roomRef.current = null
    setConnected(false)
    stopListening()
  }

  function startListening() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser — try Chrome or Edge.')
      return
    }

    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = 'en-US'

    recognition.onresult = async (event: any) => {
      const transcript = event.results[0][0].transcript
      onTranscript(transcript)
      await sendToOrchestrator(transcript)
    }

    recognition.onerror = (e: any) => console.error('Speech recognition error:', e)
    recognition.onend = () => setListening(false)

    recognitionRef.current = recognition
    recognition.start()
    setListening(true)
  }

  function stopListening() {
    recognitionRef.current?.stop()
    setListening(false)
  }

  async function sendToOrchestrator(transcript: string) {
    const res = await fetch(`${ORCHESTRATOR_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, message: transcript }),
    })
    const data = await res.json()

    if (!res.ok) {
      onResponse(`${data.error}: ${data.reason ?? ''}`)
      return
    }

    onResponse(data.response, data.trust)

    if (roomRef.current && data.trust) {
      const payload = new TextEncoder().encode(JSON.stringify({ type: 'trust_update', ...data.trust }))
      roomRef.current.localParticipant.publishData(payload, { reliable: true })
    }

    const utterance = new SpeechSynthesisUtterance(data.response)
    window.speechSynthesis.speak(utterance)
  }

  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 20 }}>
      {!connected ? (
        <button onClick={connect} style={btnBase}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#8FBF6A' }} />
          voice — connect
        </button>
      ) : (
        <>
          <button
            onClick={listening ? stopListening : startListening}
            style={{
              ...btnBase,
              background: listening ? '#E8B84B' : 'transparent',
              color: listening ? '#0A0D0A' : '#FFFFFF',
              borderColor: listening ? '#E8B84B' : 'rgba(255,255,255,0.22)',
            }}
          >
            {listening ? 'listening…' : 'voice — speak'}
          </button>
          <button onClick={disconnect} style={{ ...btnBase, color: 'rgba(255,255,255,0.5)' }}>
            disconnect
          </button>
        </>
      )}
    </div>
  )
}
