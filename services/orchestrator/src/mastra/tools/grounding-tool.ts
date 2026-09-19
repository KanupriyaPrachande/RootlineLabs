// Grounding lookup, backed directly by Moss — embedded in-process,
// no network hop to a separate evaluator/Qdrant round trip.
import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import { MossClient } from '@moss-dev/moss'

const MOSS_PROJECT_ID = process.env.MOSS_PROJECT_ID!
const MOSS_PROJECT_KEY = process.env.MOSS_PROJECT_KEY!
const INDEX_NAME = 'rootline-grounding'

const client = new MossClient(MOSS_PROJECT_ID, MOSS_PROJECT_KEY)
let indexLoaded = false

async function ensureIndexLoaded() {
  if (!indexLoaded) {
    await client.loadIndex(INDEX_NAME)
    indexLoaded = true
  }
}

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
    try {
      await ensureIndexLoaded()

      const results = await client.query(INDEX_NAME, query, { topK: 3 })

      console.log(`[moss] grounding query took ${results.timeTakenInMs}ms`)

      return {
        matches: results.docs.map((d) => ({ text: d.text, score: d.score })),
      }
    } catch (err) {
      console.error('[moss] grounding query failed:', err)
      return { matches: [] }
    }
  },
})
