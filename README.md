# Rootline

Runtime trust layer for AI agents — Mastra (orchestration) + Qdrant (grounding) +
Enkrypt-style security + OpenTelemetry (tracing) + Temporal (self-healing feedback).

## Folder structure

```
Rootline/
├── docker-compose.yml          # Qdrant + OTel Collector, one command to boot infra
├── .env.example                # copy to .env and fill in keys
├── services/
│   ├── orchestrator/           # Mastra Orchestrator (TypeScript) — the brain
│   ├── evaluator/               # Moss Evaluator (Python/FastAPI) — drift + hallucination scoring
│   ├── security/                 # Enkrypt Security (Python/FastAPI) — injection + PII checks
│   └── feedback/                  # Feedback Loop Worker (Python/Temporal) — self-healing
├── infra/
│   └── otel-collector-config.yaml
└── apps/
    └── client/                  # Next.js chat UI
```

## Build & run order (do this in order, don't skip)

```bash
# 1. copy env template and fill in your API keys
cp .env.example .env

# 2. boot infra (Qdrant + OTel Collector)
docker compose up -d

# 3. start the evaluator (Python)
cd services/evaluator
pip install -r requirements.txt --break-system-packages
uvicorn main:app --port 8001 --reload

# 4. start security service (Python) — new terminal
cd services/security
pip install -r requirements.txt --break-system-packages
uvicorn main:app --port 8002 --reload

# 5. start the orchestrator (TypeScript/Mastra) — new terminal
cd services/orchestrator
npm install
npm run dev

# 6. start the feedback worker — new terminal (optional, needs Temporal server running)
cd services/feedback
pip install -r requirements.txt --break-system-packages
python worker.py

# 7. start the client — new terminal
cd apps/client
npm install
npm run dev
```

Client runs at `http://localhost:3000`, orchestrator API at `http://localhost:4111`,
evaluator at `:8001`, security at `:8002`, Qdrant at `:6333`.

## Data flow (matches the architecture diagram)

```
Client → Orchestrator (Mastra) → [pre-execution check → Security]
                                → [continuous eval → Evaluator]
                                → [grounding lookup → Qdrant]
                                → LLM Provider
                                → [stream moderation → Security]
      → Response → Client

Evaluator/Security → incidents/drift → Feedback Worker → policy/weight updates → Security/Qdrant
All hops → OTel Collector → (Honeycomb, or any OTLP backend)
```
