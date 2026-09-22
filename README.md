# Rootline

**A runtime trust layer for AI agents — watching every turn of every conversation, not just the first prompt.**

[![Live Demo](https://img.shields.io/badge/demo-rootline--labs.vercel.app-6aa84f?style=flat-square)](https://rootline-labs.vercel.app/)
[![Orchestration](https://img.shields.io/badge/orchestration-Mastra-black?style=flat-square)]()
[![Retrieval](https://img.shields.io/badge/retrieval-Moss-red?style=flat-square)]()
[![Tracing](https://img.shields.io/badge/tracing-OpenTelemetry-purple?style=flat-square)]()
[![Self-Healing](https://img.shields.io/badge/feedback-Temporal-blue?style=flat-square)]()

**[Try it live →](https://rootline-labs.vercel.app/)**



---

## What is Rootline?

Most AI safety tooling checks a prompt once, at the door, and then trusts everything that happens after. Rootline doesn't. It sits in the runtime path of every agent turn — security, grounding, and evaluation are continuous, not one-time gates. Ask it something grounded, or something it has no business knowing, and you can watch the pipeline react in real time.

```
Security → Agent → Ground → Security → Eval
```

## Why it matters

Agents fail quietly. They drift from their instructions, hallucinate confidently, leak data they shouldn't have touched, or get steered off-course by a cleverly worded turn five messages deep. A single pre-flight prompt check catches none of this. Rootline treats trust as something to be continuously monitored across a conversation's entire lifetime, not verified once and assumed forever after.

## Architecture

```
Client → Orchestrator (Mastra)
             │
             ├── pre-execution check ──────► Security
             ├── continuous evaluation ────► Evaluator
             ├── grounding lookup ─────────► Moss
             │
             ▼
        LLM Provider (Groq)
             │
             ├── stream moderation ────────► Security
             ▼
         Response → Client

Evaluator / Security ── incidents & drift ──► Feedback Worker ──► policy & weight updates ──► Security / Moss

All hops are traced ──► OTel Collector ──► any OTLP backend (e.g. Honeycomb)
```

Every request is orchestrated by Mastra, checked against a security layer before and during execution, grounded against Moss — our retrieval layer — continuously scored for drift and hallucination by the evaluator, and traced end-to-end via OpenTelemetry. When the evaluator or security service flags an incident, a Temporal-backed feedback worker turns that signal into an update — closing the loop instead of just logging it.

<img width="800" height="600" alt="image" src="https://github.com/user-attachments/assets/48dec5c2-a3dc-4361-b143-a0e094072f41" />


## Tech stack

| Layer | Technology | Role |
|---|---|---|
| Orchestration | **Mastra** (TypeScript) | Routes and coordinates every agent turn |
| LLM inference | **Groq** (Llama-based models) | Powers the agent's reasoning and responses |
| Grounding | **Moss** | Retrieval layer backing every grounded response |
| Embeddings | **Gemini** (`gemini-embedding-001`) | Hosted embedding generation for grounding and drift scoring — kept lightweight and off-instance rather than loading a local model |
| Security | **FastAPI** (Python) | Prompt-injection and PII checks, pre- and mid-execution |
| Evaluation | **FastAPI** (Python) | Continuous drift and hallucination scoring |
| Feedback loop | **Temporal** (Python) | Turns incidents into policy and weight updates |
| Observability | **OpenTelemetry** | Distributed tracing across every hop |
| Client | **Next.js** | Chat interface, with real-time voice via LiveKit |

## Project structure

```
Rootline/
├── docker-compose.yml          # Moss (local) + OTel Collector — one command to boot infra
├── .env.example                # copy to .env and fill in keys
├── services/
│   ├── orchestrator/           # Mastra orchestrator (TypeScript) — the brain
│   ├── evaluator/               # Drift + hallucination scoring (Python/FastAPI)
│   ├── security/                 # Injection + PII checks (Python/FastAPI)
│   └── feedback/                  # Self-healing worker (Python/Temporal)
├── infra/
│   └── otel-collector-config.yaml
└── apps/
    └── client/                  # Next.js chat UI
```

## Getting started

Run these in order — later steps depend on earlier ones being up.

```bash
# 1. Copy the env template and fill in your API keys
cp .env.example .env

# 2. Boot infra: Moss + OTel Collector
docker compose up -d

# 3. Start the evaluator (Python) — new terminal
cd services/evaluator
pip install -r requirements.txt --break-system-packages
uvicorn main:app --port 8001 --reload

# 4. Start the security service (Python) — new terminal
cd services/security
pip install -r requirements.txt --break-system-packages
uvicorn main:app --port 8002 --reload

# 5. Start the orchestrator (TypeScript/Mastra) — new terminal
cd services/orchestrator
npm install
npm run dev

# 6. Start the feedback worker — new terminal (optional; needs a running Temporal server)
cd services/feedback
pip install -r requirements.txt --break-system-packages
python worker.py

# 7. Start the client — new terminal
cd apps/client
npm install
npm run dev
```

| Service | URL |
|---|---|
| Client | `http://localhost:3000` |
| Orchestrator API | `http://localhost:4111` |
| Evaluator | `http://localhost:8001` |
| Security | `http://localhost:8002` |
| Moss | `http://localhost:6333` |

## Roadmap

- [ ] Swap/extend the grounding layer for edge-native retrieval to cut round-trip latency
- [ ] Configurable policy thresholds per deployment
- [ ] Multi-agent trust propagation (trust scores that travel across agent handoffs)
- [ ] Dashboard for live incident + drift visualization

---

<p align="center"><sub>Built by <a href="https://github.com/KanupriyaPrachande">Kanupriya Prachande</a></sub></p>nupriya Prachande</a></sub></p>
