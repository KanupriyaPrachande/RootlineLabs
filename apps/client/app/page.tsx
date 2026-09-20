'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import VoiceChat from './VoiceChat'
import ArchitectureDiagram from './ArchitectureDiagram'

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
  { key: 'security', label: 'Security', color: '#EF4444' },
  { key: 'agent', label: 'Agent', color: '#9333EA' },
  { key: 'ground', label: 'Ground', color: '#0D9488' },
  { key: 'moderate', label: 'Security', color: '#EF4444' },
  { key: 'eval', label: 'Eval', color: '#D97706' },
] as const

const COLOR = {
  text: '#2B2A28', // Charcoal
  faint: '#6B7280', // Gray
  bg: '#FAFAFA',
  panel: '#FFFFFF',
  
  hero: { bg: '#F4EEFC', border: '#E0D4F5', btn: '#5E42A6' },
  why: { bg: '#E7F6EE', border: '#C6E8D5', btn: '#2D7A54' },
  arch: { bg: '#E9F2FC', border: '#C9DFFA', btn: '#2563EB' },
  demo: { bg: '#FDF1E7', border: '#F7DDC4', btn: '#C25B1D' },
  stack: { bg: '#FBF7DE', border: '#F2E9AA', btn: '#A18210' },
  roadmap: { bg: '#FCE9EF', border: '#F7C8D8', btn: '#B83A64' },
  footer: { bg: '#FAFAF7', border: '#EAEAE2' },

  allow: '#10B981',
  flag: '#F59E0B',
  block: '#EF4444'
}

function actionColor(action?: string) {
  if (action === 'block') return COLOR.block
  if (action === 'flag') return COLOR.flag
  return COLOR.allow
}

function Meter({ value, color }: { value: number; color: string }) {
  return (
    <div style={{ width: 90, height: 6, background: '#F3F4F6', position: 'relative', borderRadius: 3, overflow: 'hidden' }}>
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
    <div style={{ display: 'flex', alignItems: 'center', gap: 2, marginTop: 24, marginBottom: 16 }}>
      {STAGES.map((stage, i) => {
        const isActive = i === activeStage
        const isPast = activeStage > i || (activeStage === -1 && resultColor)
        const dotColor = isActive ? stage.color : isPast ? (resultColor ?? stage.color) : '#D1D5DB'
        const shadowColor = isActive ? `${stage.color}40` : 'transparent'
        return (
          <div key={stage.key + i} style={{ display: 'flex', alignItems: 'center', flex: i < STAGES.length - 1 ? 1 : 'initial' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: '50%',
                  background: dotColor,
                  boxShadow: isActive ? `0 0 0 4px ${shadowColor}` : 'none',
                  transition: 'all 300ms ease',
                }}
              />
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 13,
                  letterSpacing: '0.02em',
                  color: isActive ? COLOR.text : COLOR.faint,
                  fontWeight: isActive ? 600 : 400,
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
                  background: isPast ? (resultColor ?? stage.color) : '#D1D5DB',
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

const Card = ({ children, border, bg = '#FFFFFF', style = {} }: any) => (
  <div style={{
    background: bg,
    border: `1.5px solid ${border}`,
    borderRadius: 14,
    padding: '48px 40px',
    boxShadow: `0 4px 20px -4px ${border}40`,
    maxWidth: 1000,
    margin: '0 auto',
    position: 'relative',
    zIndex: 10,
    ...style
  }}>
    {children}
  </div>
)

// Background Graphic Components
const HeroGraphic = () => (
  <div style={{ position: 'absolute', top: '10%', left: '5%', zIndex: 0, opacity: 0.25, color: COLOR.hero.btn, pointerEvents: 'none' }}>
    <svg width="400" height="400" viewBox="0 0 400 400" fill="none">
      <rect x="50" y="150" width="300" height="200" rx="12" stroke="currentColor" strokeWidth="6" />
      <line x1="50" y1="190" x2="350" y2="190" stroke="currentColor" strokeWidth="6" />
      <circle cx="80" cy="170" r="4" fill="currentColor" />
      <circle cx="100" cy="170" r="4" fill="currentColor" />
      <circle cx="200" cy="150" r="80" stroke="currentColor" strokeWidth="4" strokeDasharray="10 15" />
      <circle cx="200" cy="150" r="130" stroke="currentColor" strokeWidth="4" strokeDasharray="4 8" />
      <path d="M 200 240 L 250 240 L 250 210 L 200 240" fill="currentColor" />
      <rect x="150" y="210" width="100" height="50" rx="10" stroke="currentColor" strokeWidth="4" />
    </svg>
  </div>
)

const WhyGraphicLeft = () => (
  <div style={{ position: 'absolute', top: '25%', left: '2%', zIndex: 0, opacity: 0.25, color: COLOR.why.btn, pointerEvents: 'none' }}>
    <svg width="250" height="250" viewBox="0 0 250 250" fill="none">
      <rect x="40" y="100" width="20" height="80" rx="4" stroke="currentColor" strokeWidth="6" />
      <rect x="60" y="120" width="150" height="12" stroke="currentColor" strokeWidth="6" />
      <line x1="80" y1="120" x2="90" y2="132" stroke="currentColor" strokeWidth="4" />
      <line x1="110" y1="120" x2="120" y2="132" stroke="currentColor" strokeWidth="4" />
      <line x1="140" y1="120" x2="150" y2="132" stroke="currentColor" strokeWidth="4" />
      <line x1="170" y1="120" x2="180" y2="132" stroke="currentColor" strokeWidth="4" />
      <path d="M 100 80 L 120 100 L 160 50" stroke="currentColor" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="210" y1="126" x2="250" y2="126" stroke="currentColor" strokeWidth="4" strokeDasharray="4 6" />
    </svg>
  </div>
)

const WhyGraphicRight = () => (
  <div style={{ position: 'absolute', top: '25%', right: '2%', zIndex: 0, opacity: 0.25, color: COLOR.why.btn, pointerEvents: 'none' }}>
    <svg width="250" height="250" viewBox="0 0 250 250" fill="none">
      <path d="M 75 125 C 25 75, 25 175, 75 125 C 125 75, 175 75, 225 125 C 275 175, 275 75, 225 125 C 175 175, 125 175, 75 125" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M 125 125 L 140 90 L 160 160 L 175 125" stroke="currentColor" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="150" cy="125" r="80" stroke="currentColor" strokeWidth="4" strokeDasharray="8 12" />
    </svg>
  </div>
)

const ArchIconsLeft = () => (
  <div style={{ position: 'absolute', top: 0, left: '5%', width: '100px', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-evenly', zIndex: 0, opacity: 0.25, color: COLOR.arch.btn, pointerEvents: 'none' }}>
    <svg viewBox="0 0 100 100" width="80" height="80">
       <path d="M20 50 L40 50 L60 20 L80 20 M60 80 L80 80 L40 50" stroke="currentColor" strokeWidth="8" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
       <circle cx="20" cy="50" r="12" fill="currentColor"/>
       <circle cx="80" cy="20" r="12" fill="currentColor"/>
       <circle cx="80" cy="80" r="12" fill="currentColor"/>
    </svg>
    <svg viewBox="0 0 100 100" width="80" height="80">
       <path d="M30 20 L10 20 L10 80 L30 80 M70 20 L90 20 L90 80 L70 80" stroke="currentColor" strokeWidth="8" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
       <path d="M55 20 L35 60 L55 60 L45 90 L75 45 L50 45 Z" fill="currentColor"/>
    </svg>
    <svg viewBox="0 0 100 100" width="80" height="80">
       <circle cx="50" cy="75" r="10" fill="currentColor" />
       <path d="M25 50 Q50 15 75 50" stroke="currentColor" strokeWidth="8" fill="none" strokeLinecap="round" />
       <path d="M10 30 Q50 -10 90 30" stroke="currentColor" strokeWidth="8" fill="none" strokeLinecap="round" />
    </svg>
  </div>
)

const ArchIconsRight = () => (
  <div style={{ position: 'absolute', top: 0, right: '5%', width: '100px', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-evenly', zIndex: 0, opacity: 0.25, color: COLOR.arch.btn, pointerEvents: 'none' }}>
    <svg viewBox="0 0 100 100" width="80" height="80">
       <polygon points="50,10 90,30 90,70 50,90 10,70 10,30" stroke="currentColor" strokeWidth="8" fill="none" strokeLinejoin="round" />
       <line x1="50" y1="10" x2="50" y2="50" stroke="currentColor" strokeWidth="8" />
       <line x1="10" y1="70" x2="50" y2="50" stroke="currentColor" strokeWidth="8" />
       <line x1="90" y1="70" x2="50" y2="50" stroke="currentColor" strokeWidth="8" />
       <circle cx="50" cy="50" r="10" fill="currentColor" />
    </svg>
    <svg viewBox="0 0 100 100" width="80" height="80">
       <path d="M20 20 L80 20 C80 50 50 50 50 50 C50 50 20 50 20 80 L80 80 C80 50 50 50 50 50 C50 50 20 50 20 20" stroke="currentColor" strokeWidth="8" fill="none" strokeLinejoin="round" />
       <path d="M50 50 L40 60 L60 60 Z" fill="currentColor" />
    </svg>
    <svg viewBox="0 0 100 100" width="80" height="80">
       <circle cx="50" cy="50" r="15" fill="currentColor" />
       <line x1="50" y1="10" x2="50" y2="25" stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
       <line x1="50" y1="90" x2="50" y2="75" stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
       <line x1="10" y1="50" x2="25" y2="50" stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
       <line x1="90" y1="50" x2="75" y2="50" stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
       <line x1="20" y1="20" x2="33" y2="33" stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
       <line x1="80" y1="80" x2="67" y2="67" stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
       <line x1="80" y1="20" x2="67" y2="33" stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
       <line x1="20" y1="80" x2="33" y2="67" stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
    </svg>
  </div>
)

const StackRobotLeft = () => (
  <div style={{ position: 'absolute', top: '50%', left: '3%', transform: 'translateY(-50%)', zIndex: 0, opacity: 0.25, color: COLOR.stack.btn, pointerEvents: 'none' }}>
    <svg viewBox="0 0 150 200" width="120" height="160">
       <rect x="40" y="50" width="70" height="60" rx="16" stroke="currentColor" strokeWidth="8" fill="none" />
       <circle cx="60" cy="75" r="8" fill="currentColor" />
       <circle cx="90" cy="75" r="8" fill="currentColor" />
       <path d="M65 95 C70 100 80 100 85 95" stroke="currentColor" strokeWidth="6" fill="none" strokeLinecap="round" />
       <rect x="30" y="120" width="90" height="70" rx="20" stroke="currentColor" strokeWidth="8" fill="none" />
       <line x1="75" y1="110" x2="75" y2="120" stroke="currentColor" strokeWidth="8" />
       <line x1="75" y1="20" x2="75" y2="50" stroke="currentColor" strokeWidth="8" />
       <circle cx="75" cy="15" r="6" fill="currentColor" />
       <path d="M30 140 Q10 140 10 170" stroke="currentColor" strokeWidth="8" fill="none" strokeLinecap="round" />
    </svg>
  </div>
)

const StackRobotRight = () => (
  <div style={{ position: 'absolute', top: '50%', right: '3%', transform: 'translateY(-50%)', zIndex: 0, opacity: 0.25, color: COLOR.stack.btn, pointerEvents: 'none' }}>
    <svg viewBox="0 0 150 200" width="120" height="160">
       <rect x="30" y="60" width="90" height="60" rx="30" stroke="currentColor" strokeWidth="8" fill="none" />
       <circle cx="55" cy="90" r="10" fill="currentColor" />
       <circle cx="95" cy="90" r="10" fill="currentColor" />
       <rect x="45" y="130" width="60" height="60" rx="12" stroke="currentColor" strokeWidth="8" fill="none" />
       <line x1="75" y1="120" x2="75" y2="130" stroke="currentColor" strokeWidth="8" />
       <path d="M120 150 Q140 150 140 180" stroke="currentColor" strokeWidth="8" fill="none" strokeLinecap="round" />
       <path d="M30 150 Q10 150 10 180" stroke="currentColor" strokeWidth="8" fill="none" strokeLinecap="round" />
       <polygon points="75,20 60,60 90,60" fill="currentColor" />
    </svg>
  </div>
)


const DemoDeskRight = () => (
  <div style={{ position: 'absolute', top: '50%', right: '2%', transform: 'translateY(-50%)', zIndex: 0, opacity: 0.25, color: COLOR.demo.btn, pointerEvents: 'none' }}>
    <svg width="250" height="250" viewBox="0 0 250 250" fill="none">
      {/* Desk Surface Line */}
      <line x1="10" y1="200" x2="240" y2="200" stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
      
      {/* Laptop Side Profile */}
      <path d="M 50 200 L 120 120 L 130 120 L 70 200 Z" fill="currentColor" />
      <path d="M 50 200 L 150 200 L 150 190 L 55 190 Z" fill="currentColor" />
      
      {/* Coffee Mug */}
      <rect x="180" y="160" width="30" height="40" rx="4" stroke="currentColor" strokeWidth="6" />
      <path d="M 210 170 Q 225 170 225 180 Q 225 190 210 190" stroke="currentColor" strokeWidth="6" fill="none" strokeLinecap="round" />
      
      {/* Mouse */}
      <path d="M 140 190 Q 140 175 160 175 Q 170 175 170 190 Z" fill="currentColor" />
      
      {/* Faint code/tech accents */}
      <line x1="80" y1="90" x2="140" y2="90" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeDasharray="8 8" />
      <line x1="100" y1="70" x2="160" y2="70" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeDasharray="8 8" />
    </svg>
  </div>
)

const RoadmapRoadLeft = () => (
  <div style={{ position: 'absolute', top: '10%', left: '5%', height: '80%', width: '120px', zIndex: 0, opacity: 0.35, pointerEvents: 'none' }}>
    <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: 'absolute', top: 0, left: 0 }}>
       <path d="M 50 0 C 10 20, 90 80, 50 100" stroke={COLOR.roadmap.border} strokeWidth="10" fill="none" vectorEffect="non-scaling-stroke" />
       <path d="M 50 0 C 10 20, 90 80, 50 100" stroke="#FFFFFF" strokeWidth="3" strokeDasharray="12 12" fill="none" vectorEffect="non-scaling-stroke" />
    </svg>
  </div>
)

const RoadmapRoadRight = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const carRef = useRef<SVGSVGElement>(null);
  const pointsRef = useRef<{x: number, y: number, angle: number}[]>([]);
  const NUM_SAMPLES = 200;
  
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    setReducedMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    const sample = () => {
      if (!pathRef.current || !containerRef.current) return;
      const len = pathRef.current.getTotalLength();
      if (len === 0) return;
      const pts = [];
      const w = containerRef.current.offsetWidth;
      const h = containerRef.current.offsetHeight;
      
      for (let i = 0; i <= NUM_SAMPLES; i++) {
        const r = i / NUM_SAMPLES;
        const p = pathRef.current.getPointAtLength(r * len);
        const px = (p.x / 100) * w;
        const py = (p.y / 100) * h;
        pts.push({ x: px, y: py, angle: 0 });
      }
      
      for (let i = 1; i <= NUM_SAMPLES; i++) {
        const prev = pts[i-1];
        const curr = pts[i];
        pts[i].angle = Math.atan2(curr.y - prev.y, curr.x - prev.x) * (180 / Math.PI);
      }
      pts[0].angle = pts[1].angle;
      pointsRef.current = pts;
    }
    sample();
    window.addEventListener('resize', sample);
    return () => window.removeEventListener('resize', sample);
  }, []);

  useEffect(() => {
    let animationFrameId: number;
    const tick = () => {
      if (containerRef.current && carRef.current && pointsRef.current.length > 0) {
        const rect = containerRef.current.getBoundingClientRect();
        let progress = 0.5;
        if (!reducedMotion) {
           const progressRaw = 1 - ((rect.bottom) / (window.innerHeight + rect.height));
           progress = Math.max(0, Math.min(1, progressRaw));
        }
        const index = progress * NUM_SAMPLES;
        const lower = Math.floor(index);
        const upper = Math.ceil(index);
        const weight = index - lower;
        
        const p1 = pointsRef.current[Math.min(lower, NUM_SAMPLES)];
        const p2 = pointsRef.current[Math.min(upper, NUM_SAMPLES)];
        
        const x = p1.x + (p2.x - p1.x) * weight;
        const y = p1.y + (p2.y - p1.y) * weight;
        
        let a1 = p1.angle;
        let a2 = p2.angle;
        if (Math.abs(a1 - a2) > 180) {
           if (a1 > a2) a2 += 360;
           else a1 += 360;
        }
        const angle = a1 + (a2 - a1) * weight;
        
        carRef.current.style.transform = `translate(${x}px, ${y}px) rotate(${angle}deg)`; 
      }
      animationFrameId = requestAnimationFrame(tick);
    }
    animationFrameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationFrameId);
  }, [reducedMotion]);

  return (
    <div ref={containerRef} style={{ position: 'absolute', top: '10%', right: '5%', height: '80%', width: '120px', zIndex: 0, opacity: 0.35, pointerEvents: 'none' }}>
      <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: 'absolute', top: 0, left: 0 }}>
         <path ref={pathRef} d="M 50 0 C 90 20, 10 80, 50 100" stroke={COLOR.roadmap.border} strokeWidth="10" fill="none" vectorEffect="non-scaling-stroke" />
         <path d="M 50 0 C 90 20, 10 80, 50 100" stroke="#FFFFFF" strokeWidth="3" strokeDasharray="12 12" fill="none" vectorEffect="non-scaling-stroke" />
      </svg>
      <svg ref={carRef} viewBox="0 0 40 20" width="40" height="20" style={{ position: 'absolute', top: -10, left: -20, color: COLOR.roadmap.btn, filter: `drop-shadow(0px 4px 8px ${COLOR.roadmap.btn}60)`, transformOrigin: 'center center' }}>
        <rect x="2" y="2" width="36" height="16" rx="6" fill="currentColor" />
        <path d="M 12 4 L 28 4 L 25 16 L 15 16 Z" fill="#FFFFFF" opacity="0.8" />
      </svg>
    </div>
  );
}

export default function LandingPage() {
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
        setLastResultColor(COLOR.block)
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', text: data.error ?? 'Request failed', reason: data.reason, blocked: true },
        ])
      } else {
        setLastResultColor(actionColor(data.trust?.action))
        setMessages((prev) => [...prev, { role: 'assistant', text: data.response, trust: data.trust }])
      }
    } catch (e) {
      setLastResultColor(COLOR.block)
      setMessages((prev) => [...prev, { role: 'assistant', text: 'Could not reach orchestrator.', blocked: true }])
    } finally {
      setLoading(false)
      setActiveStage(-1)
    }
  }

  return (
    <main style={{ width: '100%', minHeight: '100vh', display: 'flex', flexDirection: 'column', position: 'relative', overflowX: 'hidden' }}>

      {/* 1. Hero Section */}
      <section style={{ background: COLOR.hero.bg, padding: '120px 32px 100px', position: 'relative' }}>
        <HeroGraphic />
        <Card border={COLOR.hero.border}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'center' }}>
              <div style={{ padding: '8px 16px', borderRadius: 20, background: '#fff', border: `1.5px solid ${COLOR.hero.border}`, color: COLOR.hero.btn, fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                Rootline
              </div>
            </div>
            <h1
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 900,
                fontSize: 84,
                margin: '0 0 24px',
                letterSpacing: '-0.04em',
                lineHeight: 1.05,
              }}
            >
              <span style={{ color: COLOR.text }}>Trust isn't a one-time gate.</span><br />
              <span style={{ color: COLOR.hero.btn }}>It's continuous.</span>
            </h1>
            <p style={{ color: COLOR.faint, fontSize: 22, maxWidth: 650, margin: '0 auto 48px', lineHeight: 1.6 }}>
              A runtime trust layer for AI agents that watches every turn of every conversation, automatically evaluating drift, hallucination risk, and security.
            </p>
            <button
              onClick={() => document.getElementById('demo-section')?.scrollIntoView({ behavior: 'smooth' })}
              style={{
                padding: '18px 36px',
                background: COLOR.hero.btn,
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                fontSize: 18,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'opacity 0.2s',
                fontFamily: 'var(--font-sans)',
              }}
              onMouseOver={(e) => (e.currentTarget.style.opacity = '0.9')}
              onMouseOut={(e) => (e.currentTarget.style.opacity = '1')}
            >
              Try Live Demo
            </button>
          </div>
        </Card>
      </section>

      {/* 2. Why it matters */}
      <section style={{ background: COLOR.why.bg, padding: '120px 32px', position: 'relative' }}>
        <WhyGraphicLeft />
        <WhyGraphicRight />
        <Card border={COLOR.why.border}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80 }}>
            <div>
              <div style={{ color: COLOR.faint, fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 600, marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.05em' }}>The Old Way</div>
              <h3 style={{ fontSize: 42, margin: '0 0 20px', color: COLOR.text, fontFamily: 'var(--font-display)', fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1.1 }}>Pre-flight prompt checks</h3>
              <p style={{ color: COLOR.faint, fontSize: 18, lineHeight: 1.65 }}>
                Most safety tooling checks a prompt once at the door and trusts everything after. But agents loop, tool use drifts, and hallucinations compound. A single static check is blind to the actual runtime behavior of your agent.
              </p>
            </div>
            <div>
              <div style={{ color: COLOR.why.btn, fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 600, marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.05em' }}>The Rootline Way</div>
              <h3 style={{ fontSize: 42, margin: '0 0 20px', color: COLOR.why.btn, fontFamily: 'var(--font-display)', fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1.1 }}>Continuous runtime monitoring</h3>
              <p style={{ color: COLOR.faint, fontSize: 18, lineHeight: 1.65 }}>
                Rootline sits in the runtime path. Security, grounding, and evaluation run continuously across a conversation&apos;s whole lifetime. Incidents feed back into a Temporal loop for immediate policy updates, closing the loop instead of just logging it.
              </p>
            </div>
          </div>
        </Card>
      </section>

      {/* 3. Architecture */}
      <section style={{ background: COLOR.arch.bg, padding: '120px 32px', position: 'relative' }}>
        <ArchIconsLeft />
        <ArchIconsRight />
        <Card border={COLOR.arch.border}>
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ fontSize: 48, margin: '0 0 16px', color: COLOR.text, fontFamily: 'var(--font-display)', fontWeight: 900, letterSpacing: '-0.03em' }}>The Pipeline</h2>
            <p style={{ color: COLOR.faint, fontSize: 20, maxWidth: 650, margin: '0 auto 48px' }}>
              A continuous loop of security checks, grounding lookups, and evaluation, backed by Temporal for immediate policy updates.
            </p>
          </div>
          <ArchitectureDiagram />
        </Card>
      </section>

      {/* 4. Live Demo */}
      <section id="demo-section" style={{ background: COLOR.demo.bg, padding: '120px 32px', position: 'relative' }}>
        <DemoDeskRight />
        <Card border={COLOR.demo.border}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h2 style={{ fontSize: 48, margin: '0 0 16px', color: COLOR.demo.btn, fontFamily: 'var(--font-display)', fontWeight: 900, letterSpacing: '-0.03em' }}>Live Demo</h2>
            <p style={{ color: COLOR.faint, fontSize: 20 }}>Experience the runtime trust pipeline in action.</p>
          </div>

          <div style={{ background: '#FAFAFA', border: `1.5px solid ${COLOR.demo.border}`, borderRadius: 12, padding: 32 }}>
            <PipelinePulse activeStage={activeStage} resultColor={lastResultColor} />
            
            <div
              style={{
                borderTop: `1px solid ${COLOR.demo.border}`,
                paddingTop: 32,
                minHeight: 380,
                display: 'flex',
                flexDirection: 'column',
                gap: 26,
              }}
            >
              {messages.length === 0 && (
                <p style={{ color: COLOR.faint, fontSize: 18, fontStyle: 'italic', textAlign: 'center', margin: 'auto' }}>
                  Ask something grounded, or something it can&apos;t know — either way, watch the pipeline above.
                </p>
              )}

              {messages.map((m, i) =>
                m.role === 'user' ? (
                  <div key={i} style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-block', background: '#E5E7EB', padding: '12px 20px', borderRadius: 16, borderBottomRightRadius: 4 }}>
                      <p style={{ margin: 0, fontSize: 18, color: COLOR.text }}>{m.text}</p>
                    </div>
                  </div>
                ) : (
                  <div
                    key={i}
                    style={{
                      borderLeft: `4px solid ${m.blocked ? COLOR.block : actionColor(m.trust?.action)}`,
                      paddingLeft: 20,
                      background: '#FFFFFF',
                      padding: '20px 20px 20px 24px',
                      borderRadius: '0 12px 12px 0',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                    }}
                  >
                    <p style={{ margin: 0, fontSize: 18, lineHeight: 1.65, color: COLOR.text }}>{m.text}</p>
                    {m.reason && (
                      <p style={{ margin: '12px 0 0', fontSize: 14, color: COLOR.faint, fontFamily: 'var(--font-mono)' }}>
                        {m.reason}
                      </p>
                    )}
                    {m.trust && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginTop: 16, flexWrap: 'wrap', borderTop: `1px solid #E5E7EB`, paddingTop: 16 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: COLOR.faint }}>drift</span>
                          <Meter value={m.trust.drift_score} color={COLOR.flag} />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: COLOR.faint }}>risk</span>
                          <Meter value={m.trust.hallucination_risk} color={COLOR.block} />
                        </div>
                        <span
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: 13,
                            fontWeight: 600,
                            color: actionColor(m.trust.action),
                            marginLeft: 'auto',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
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
                
                  <div style={{ borderLeft: `4px solid #D1D5DB`, paddingLeft: 24, paddingTop: 12, paddingBottom: 12 }}>
                  <p style={{ margin: 0, fontSize: 16, color: COLOR.faint, fontFamily: 'var(--font-mono)' }}>
                    {STAGES[Math.max(activeStage, 0)]?.label.toLowerCase()}…
                  </p>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 32 }}>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Ask something…"
                style={{
                  flex: 1,
                  padding: '16px 20px',
                  background: '#FFFFFF',
                  border: `1.5px solid ${COLOR.demo.border}`,
                  borderRadius: 8,
                  color: COLOR.text,
                  fontSize: 16,
                  outline: 'none',
                  transition: 'border-color 0.2s',
                  fontFamily: 'var(--font-sans)',
                }}
              />
              <button
                onClick={sendMessage}
                style={{
                  padding: '16px 32px',
                  background: COLOR.demo.btn,
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 16,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'opacity 0.2s',
                  fontFamily: 'var(--font-sans)',
                }}
                onMouseOver={(e) => (e.currentTarget.style.opacity = '0.9')}
                onMouseOut={(e) => (e.currentTarget.style.opacity = '1')}
              >
                Send
              </button>
            </div>

            <div style={{ marginTop: 24, textAlign: 'center' }}>
              <VoiceChat
                sessionId={sessionId}
                onTranscript={(text) => setMessages((prev) => [...prev, { role: 'user', text }])}
                onResponse={(text, trust) => {
                  setLastResultColor(actionColor(trust?.action))
                  setMessages((prev) => [...prev, { role: 'assistant', text, trust }])
                }}
              />
            </div>
          </div>
        </Card>
      </section>

      {/* 5. Tech Stack */}
      <section style={{ padding: '120px 32px', background: COLOR.stack.bg, position: 'relative' }}>
        <StackRobotLeft />
        <StackRobotRight />
        <Card border={COLOR.stack.border}>
          <h2 style={{ fontSize: 48, margin: '0 0 48px', color: COLOR.text, fontFamily: 'var(--font-display)', fontWeight: 900, letterSpacing: '-0.03em', textAlign: 'center' }}>Powered by</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
            {[
              { name: 'Mastra', role: 'Agent Orchestration', tag: '#F3E8FF', tagText: '#9333EA' },
              { name: 'Qdrant', role: 'Vector Store & Grounding', tag: '#CCFBF1', tagText: '#0D9488' },
              { name: 'FastAPI', role: 'Security & Evaluation', tag: '#FEE2E2', tagText: '#EF4444' },
              { name: 'Temporal', role: 'Feedback Loop & Updates', tag: '#FCE7F3', tagText: '#DB2777' },
              { name: 'OpenTelemetry', role: 'End-to-end Tracing', tag: '#F1F5F9', tagText: '#475569' },
              { name: 'Next.js', role: 'Client Interface', tag: '#E0E7FF', tagText: '#4F46E5' },
            ].map((tech) => (
              <div key={tech.name} style={{ background: '#fff', padding: 24, borderRadius: 10, border: `1.5px solid ${COLOR.stack.border}` }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <h4 style={{ margin: 0, fontSize: 22, color: COLOR.text, fontWeight: 700 }}>{tech.name}</h4>
                  <div style={{ width: 12, height: 12, borderRadius: '50%', background: tech.tagText }} />
                </div>
                <p style={{ margin: 0, color: COLOR.faint, fontSize: 15, fontFamily: 'var(--font-mono)' }}>{tech.role}</p>
              </div>
            ))}
          </div>
        </Card>
      </section>

      {/* 6. Roadmap */}
      <section style={{ padding: '120px 32px', background: COLOR.roadmap.bg, position: 'relative' }}>
        <RoadmapRoadLeft />
        <RoadmapRoadRight />
        <Card border={COLOR.roadmap.border}>
          <h2 style={{ fontSize: 48, margin: '0 0 48px', color: COLOR.text, fontFamily: 'var(--font-display)', fontWeight: 900, letterSpacing: '-0.03em', textAlign: 'center' }}>Roadmap</h2>
          <ul style={{ listStyle: 'none', padding: 0, margin: '0 auto', maxWidth: 600, display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[
              'Edge-native grounding capabilities',
              'Configurable policy thresholds via UI',
              'Multi-agent trust propagation',
              'Comprehensive incident & drift dashboard',
            ].map((item, i) => (
              <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 18, color: COLOR.text, background: '#fff', padding: '20px 24px', borderRadius: 10, border: `1.5px solid ${COLOR.roadmap.border}` }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: COLOR.roadmap.btn }} />
                {item}
              </li>
            ))}
          </ul>
        </Card>
      </section>

      {/* 7. Footer */}
      <footer style={{ padding: '48px 32px', background: COLOR.footer.bg, position: 'relative', zIndex: 10 }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: `1.5px solid ${COLOR.footer.border}`, background: '#fff', padding: '24px 32px', borderRadius: 10 }}>
          <p style={{ margin: 0, color: COLOR.faint, fontSize: 15 }}>
            Built with security in mind.
          </p>
          <a href="#" style={{ color: COLOR.text, textDecoration: 'none', fontWeight: 600, fontFamily: 'var(--font-mono)', fontSize: 14 }}>
            GitHub Repository ↗
          </a>
        </div>
      </footer>
    </main>
  )
}
