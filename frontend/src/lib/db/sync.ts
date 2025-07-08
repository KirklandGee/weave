import { db } from './campaignDB'
import type { Change } from '@/types/node'
import { CAMPAIGN_SLUG } from '@/lib/constants'

const API = '/api/campaign'   // adjust to your FastAPI proxy

export async function pushPull() {
  // 1. push local changes
  const changes: Change[] = await db.changes.toArray()
  if (changes.length) {
    const res = await fetch(`${API}/${CAMPAIGN_SLUG}/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(changes),
    })
    if (res.ok) {
      await db.changes.clear()
    } else {
      console.error('Push failed:', await res.text())
      return                     // keep changes for the next attempt
    }
  }

  // 2. pull fresh nodes since last known update
  const last = (await db.nodes.orderBy('updatedAt').last())?.updatedAt ?? 0
  const fresh = await fetch(
    `${API}/${CAMPAIGN_SLUG}/since/${last}`
  ).then(r => r.json())

  if (fresh.length) await db.nodes.bulkPut(fresh)
}

// TODO: Implement the below
// export async function pull() {
//   // 1. read the last sync cursor (server time!) from a tiny meta table
//   const meta = await db.table('meta').get('lastSync')
//   const since = meta?.value ?? 0

//   // 2. ask server for *changes* since that cursor
//   const res = await fetch(`${API}/${CAMPAIGN_SLUG}/since/${since}`)
//   if (!res.ok) {
//     console.error('Pull failed', await res.text())
//     return
//   }
//   const { changes, maxTs } = await res.json()   // { changes: [...], maxTs: 1720562625123 }

//   if (!changes.length) return

//   // 3. apply changes atomically
//   await db.transaction('rw', db.nodes, db.meta, async () => {
//     for (const ch of changes) {
//       if (ch.op === 'delete') {
//         await db.nodes.delete(ch.nodeId)
//       } else if (ch.op === 'upsert') {
//         const local = await db.nodes.get(ch.node.id)
//         if (!local || ch.node.updatedAt > local.updatedAt) {
//           await db.nodes.put(ch.node)          // upsert newer version
//         }
//       }
//     }
//     // 4. persist new cursor
//     await db.meta.put({ id: 'lastSync', value: maxTs })
//   })
// }