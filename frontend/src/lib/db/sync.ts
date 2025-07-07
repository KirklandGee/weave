import { db } from './campaignDB'
import type { Change } from '@/types/node'
import { CAMPAIGN_SLUG } from '@/lib/constants'

const API = '/api/campaign'   // adjust to your FastAPI proxy

export async function pushPull() {
  // 1. push local changes
  const changes: Change[] = await db.changes.toArray()
  if (changes.length) {
    await fetch(`${API}/${CAMPAIGN_SLUG}/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(changes),
    })
    await db.changes.clear()
  }

  // 2. pull fresh nodes since last known update
  const last = (await db.nodes.orderBy('updatedAt').last())?.updatedAt ?? 0
  const fresh = await fetch(
    `${API}/${CAMPAIGN_SLUG}/since/${last}`
  ).then(r => r.json())

  if (fresh.length) await db.nodes.bulkPut(fresh)
}