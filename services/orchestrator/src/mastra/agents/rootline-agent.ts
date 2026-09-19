// Rootline's primary agent. Model is a "provider/model" string — Mastra resolves
// the provider and reads the matching env var (OPENAI_API_KEY / ANTHROPIC_API_KEY)
// automatically. Do not import or pass a separate provider object.
import { Agent } from '@mastra/core/agent'
import { groundingTool } from '../tools/grounding-tool.ts'

export const rootlineAgent = new Agent({
  id: 'rootline-agent',
  name: 'Rootline Agent',
  instructions: `
    You are the primary agent behind Rootline, a trust-first AI assistant.
    Always ground factual claims using the grounding-lookup tool before answering.
    If the tool returns no relevant matches, say so explicitly rather than guessing.
    Keep responses concise and avoid speculation on topics outside the provided context.
  `,
  // Swap to 'openai/gpt-5.6-sol' if you're on OpenAI instead — just make sure the
  // matching API key is set in .env.
  
  model: 'groq/llama-3.1-8b-instant',
  tools: { groundingTool },
})
