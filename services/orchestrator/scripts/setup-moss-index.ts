import { MossClient } from '@moss-dev/moss'
import 'dotenv/config'

const MOSS_PROJECT_ID = process.env.MOSS_PROJECT_ID!
const MOSS_PROJECT_KEY = process.env.MOSS_PROJECT_KEY!

async function main() {
  const client = new MossClient(MOSS_PROJECT_ID, MOSS_PROJECT_KEY)

  await client.createIndex('rootline-grounding', [
    { id: '1', text: 'REPLACE ME — your first grounding document.' },
    { id: '2', text: 'REPLACE ME — your second grounding document.' },
  ])

  console.log('Moss index "rootline-grounding" created and populated.')
}

main().catch((err) => {
  console.error('Failed to set up Moss index:', err)
  process.exit(1)
})
