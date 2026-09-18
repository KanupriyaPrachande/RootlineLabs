import { Mastra } from '@mastra/core'
import { rootlineAgent } from './agents/rootline-agent.ts'

export const mastra = new Mastra({
  agents: { rootlineAgent },
})
