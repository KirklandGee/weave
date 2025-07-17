import { getDb } from './campaignDB'
import type { Change } from '@/types/node'

const API = '/api/sync'   // adjust to your FastAPI proxy

// Fix typing here
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function edgeSnakeToCamel(edge: any): any {
  return {
    id: edge.id,
    fromId: edge.from_id,
    toId: edge.to_id,
    fromTitle: edge.from_title,
    toTitle: edge.to_title,
    relType: edge.relType,
    updatedAt: edge.updatedAt,
    createdAt: edge.createdAt,
    attributes: edge.attributes ?? {},
  };
}

export async function pushPull(
  authFetch: (url: string, options?: RequestInit) => Promise<Response>,
  campaignSlug: string
) {
  const db = getDb(campaignSlug)

  // 1. push local changes
  const changes: Change[] = await db.changes.toArray()
  if (changes.length) {
    const res = await authFetch(`${API}/${campaignSlug}`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(changes),
    })
    if (res.ok) {
      await db.changes.clear()
    } else {
      console.error('Push failed:', await res.text())
      return                     // keep changes for the next attempt
    }
  }
  // 1. pull fresh nodes
  const lastNode = (await db.nodes.orderBy('updatedAt').last())?.updatedAt ?? 0;
  const freshNodes = await authFetch(
    `${API}/${campaignSlug}/nodes/since/${lastNode}`,
    { headers: { 'Content-Type':'application/json'} }
  ).then(r => r.json());
  if (freshNodes.length) await db.nodes.bulkPut(freshNodes);
  
  // 2. pull fresh edges
  const lastEdge = (await db.edges.orderBy('updatedAt').last())?.updatedAt ?? 0;
  const freshEdges = await authFetch(
    `${API}/${campaignSlug}/edges/since/${lastEdge}`,
    { headers: { 'Content-Type':'application/json' } }
  ).then(r => r.json());

  const camelEdges = freshEdges.map(edgeSnakeToCamel);


  if (freshEdges.length) await db.edges.bulkPut(camelEdges);
}

// TODO: Implement something like the below
// export async function pull() {
//   // 1. read the last sync cursor (server time!) from a tiny meta table
//   const meta = await db.table('meta').get('lastSync')
//   const since = meta?.value ?? 0

//   // 2. ask server for *changes* since that cursor
//   const res = await fetch(`${API}/${campaignSlug}/since/${since}`)
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