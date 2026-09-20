'use client'

import { useEffect, useState } from 'react'

export default function ArchitectureDiagram() {
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return <div style={{ minHeight: 650 }} />

  const C = {
    client: { bg: '#E0E7FF', pulse: '#4F46E5' }, // Indigo
    orch: { bg: '#F3E8FF', pulse: '#9333EA' }, // Violet
    sec: { bg: '#FEE2E2', pulse: '#EF4444' }, // Red
    qdrant: { bg: '#CCFBF1', pulse: '#0D9488' }, // Teal
    eval: { bg: '#FEF3C7', pulse: '#D97706' }, // Amber
    llm: { bg: '#DBEAFE', pulse: '#2563EB' }, // Blue
    temporal: { bg: '#FCE7F3', pulse: '#DB2777' }, // Pink
    otel: { bg: '#F1F5F9', pulse: '#475569' }, // Slate
    
    text: '#2B2A28',
    muted: '#6B7280',
    line: '#D1D5DB' // Base gray for static lines
  }

  const Node = ({ x, y, width, height, title, subtitle, colorTheme }: any) => (
    <g transform={`translate(${x - width / 2}, ${y - height / 2})`}>
      <rect
        width={width}
        height={height}
        rx="10"
        fill={colorTheme.bg}
        stroke={colorTheme.pulse}
        strokeWidth="1.5"
      />
      <text x={width / 2} y={height / 2 - (subtitle ? 6 : -4)} textAnchor="middle" fill={C.text} fontSize="14" fontWeight="600" fontFamily="var(--font-mono)">
        {title}
      </text>
      {subtitle && (
        <text x={width / 2} y={height / 2 + 14} textAnchor="middle" fill={colorTheme.pulse} fontSize="12" fontFamily="var(--font-mono)">
          {subtitle}
        </text>
      )}
    </g>
  )

  const AnimatedLine = ({ d, color, duration = '1s', reverse = false }: any) => (
    <g>
      {/* Base colored line */}
      <path d={d} stroke={color} strokeWidth="2" fill="none" opacity="0.3" />
      {/* Animated dashed line on top */}
      <path 
        d={d} 
        stroke={color} 
        strokeWidth="2.5" 
        fill="none" 
        style={{
          strokeDasharray: '6 8',
          animation: `${reverse ? 'flowReverse' : 'flow'} ${duration} linear infinite`
        }} 
      />
    </g>
  )

  return (
    <div style={{ width: '100%', overflowX: 'auto', display: 'flex', justifyContent: 'center', padding: '20px 0' }}>
      <style>{`
        @keyframes flow { to { stroke-dashoffset: -28; } }
        @keyframes flowReverse { to { stroke-dashoffset: 28; } }
      `}</style>
      <svg width="1000" height="700" viewBox="0 0 1000 700" style={{ maxWidth: '100%' }}>
        <defs>
          <marker id="arrow-sec" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill={C.sec.pulse} />
          </marker>
          <marker id="arrow-qdrant" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill={C.qdrant.pulse} />
          </marker>
          <marker id="arrow-eval" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill={C.eval.pulse} />
          </marker>
          <marker id="arrow-temporal" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill={C.temporal.pulse} />
          </marker>
          <marker id="arrow-llm" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill={C.llm.pulse} />
          </marker>
          <marker id="arrow-client" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill={C.client.pulse} />
          </marker>
          <marker id="arrow-orch" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill={C.orch.pulse} />
          </marker>
        </defs>

        {/* --- Connections with Flow Animation --- */}
        
        {/* Client -> Orch (Orch color) */}
        <g markerEnd="url(#arrow-orch)">
          <AnimatedLine d="M 500 110 L 500 200" color={C.orch.pulse} />
        </g>
        
        {/* Orch -> Sec pre-check (Sec color) */}
        <g markerEnd="url(#arrow-sec)">
          <AnimatedLine d="M 400 250 L 300 250" color={C.sec.pulse} />
        </g>

        {/* Orch -> Eval (Eval color) */}
        <g markerEnd="url(#arrow-eval)">
          <AnimatedLine d="M 600 250 L 700 250" color={C.eval.pulse} />
        </g>

        {/* Orch -> Qdrant (Qdrant color) */}
        <g markerEnd="url(#arrow-qdrant)">
          <AnimatedLine d="M 400 230 Q 200 230 200 150" color={C.qdrant.pulse} />
        </g>

        {/* Orch -> LLM (LLM color) */}
        <g markerEnd="url(#arrow-llm)">
          <AnimatedLine d="M 500 300 L 500 430" color={C.llm.pulse} />
        </g>

        {/* LLM -> Sec stream mod (Sec color) */}
        <g markerEnd="url(#arrow-sec)">
          <AnimatedLine d="M 400 480 Q 200 480 200 300" color={C.sec.pulse} />
        </g>

        {/* LLM -> Client response (Client color) */}
        <g markerEnd="url(#arrow-client)">
          <AnimatedLine d="M 600 480 Q 800 480 800 100 L 600 100" color={C.client.pulse} />
        </g>

        {/* Incident Lines: Sec/Eval -> Temporal (Temporal color) */}
        <g markerEnd="url(#arrow-temporal)">
          <AnimatedLine d="M 250 300 L 250 550" color={C.temporal.pulse} />
          <AnimatedLine d="M 800 300 L 800 600 L 300 600" color={C.temporal.pulse} />
        </g>

        {/* Feedback Lines: Temporal -> Sec/Qdrant (Temporal color, flowing backward) */}
        <g markerEnd="url(#arrow-sec)">
          <AnimatedLine d="M 150 300 L 150 550" color={C.temporal.pulse} reverse={true} /> 
        </g>
        <g markerEnd="url(#arrow-qdrant)">
          <AnimatedLine d="M 150 110 L 130 110 L 130 550" color={C.temporal.pulse} reverse={true} />
        </g>

        {/* Labels for paths */}
        <text x="350" y="240" fill={C.sec.pulse} fontSize="12" textAnchor="middle" fontFamily="var(--font-mono)">pre-check</text>
        <text x="650" y="240" fill={C.eval.pulse} fontSize="12" textAnchor="middle" fontFamily="var(--font-mono)">eval</text>
        <text x="280" y="215" fill={C.qdrant.pulse} fontSize="12" textAnchor="middle" fontFamily="var(--font-mono)">grounding</text>
        <text x="510" y="365" fill={C.llm.pulse} fontSize="12" fontFamily="var(--font-mono)">prompt</text>
        <text x="300" y="470" fill={C.sec.pulse} fontSize="12" textAnchor="middle" fontFamily="var(--font-mono)">stream mod</text>
        <text x="700" y="380" fill={C.client.pulse} fontSize="12" textAnchor="middle" fontFamily="var(--font-mono)">response</text>
        
        {/* Feedback labels */}
        <text x="140" y="420" fill={C.temporal.pulse} fontSize="12" textAnchor="end" fontFamily="var(--font-mono)">policy & weight updates</text>
        <text x="120" y="200" fill={C.temporal.pulse} fontSize="12" textAnchor="end" fontFamily="var(--font-mono)">policy & weight updates</text>
        <text x="500" y="590" fill={C.temporal.pulse} fontSize="12" textAnchor="middle" fontFamily="var(--font-mono)">incident / drift events</text>

        {/* Nodes */}
        <Node x={500} y={80} width={180} height={60} title="Client" subtitle="(Next.js)" colorTheme={C.client} />
        <Node x={500} y={250} width={200} height={100} title="Orchestrator" subtitle="(Mastra)" colorTheme={C.orch} />
        <Node x={200} y={250} width={180} height={100} title="Security" subtitle="(FastAPI)" colorTheme={C.sec} />
        <Node x={800} y={250} width={180} height={100} title="Evaluator" subtitle="(FastAPI)" colorTheme={C.eval} />
        <Node x={200} y={110} width={180} height={80} title="Qdrant" subtitle="(Vector Store)" colorTheme={C.qdrant} />
        <Node x={500} y={480} width={200} height={100} title="LLM Provider" colorTheme={C.llm} />
        <Node x={200} y={600} width={180} height={100} title="Feedback Worker" subtitle="(Temporal)" colorTheme={C.temporal} />
        <Node x={800} y={600} width={180} height={100} title="OpenTelemetry" subtitle="(Tracing / OTLP)" colorTheme={C.otel} />

        {/* OTel Dotted connections (background observability) */}
        <g stroke={C.otel.pulse} strokeWidth="1.5" strokeDasharray="2 4" fill="none" opacity="0.6">
          <path d="M 800 300 L 800 550" />
          <path d="M 600 250 L 800 550" />
          <path d="M 600 480 L 800 550" />
        </g>
      </svg>
    </div>
  )
}
