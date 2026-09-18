// Grounding tool — the "grounding lookup" edge in the architecture diagram.
// IMPORTANT: this calls the Moss Evaluator's /ground endpoint, which owns the
// one embedder shared by the whole system, instead of asking the LLM to
// supply a precomputed embedding — LLMs can't generate real embedding
// vectors, so that earlier design was silently returning no matches.
import { createTool } from '@mastra/core/tools'
import { z } from 'zod'

const EVALUATOR_URL = process.env.EVALUATOR_URL || 'http://localhost:8011'

export const groundingTool = createTool({
  id: 'grounding-lookup',
  description:
    'Search the grounding database for facts/context relevant to a query, ' +
    'before answering. Use this whenever the user asks something factual.',
  inputSchema: z.object({
    query: z.string().describe('The text to search for supporting context'),
  }),
  outputSchema: z.object({
    matches: z.array(
      z.object({
        text: z.string(),
        score: z.number(),
      })
    ),
  }),
  execute: async ({ query }) => {
    const res = await fetch(`${EVALUATOR_URL}/ground`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, top_k: 3 }),
    })

    if (!res.ok) {
      return { matches: [] }
    }

    const data = (await res.json()) as { matches: { text: string; score: number }[] }
    return { matches: data.matches }
  },
})