import { getDb } from './campaignDB'
import type { Change } from '@/types/node'
import { shouldSync, setSyncState, getSyncState } from '../utils/activityTracker'

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

  // Check if sync is needed based on activity and local changes
  const syncNeeded = await shouldSync(campaignSlug)
  if (!syncNeeded) {
    return
  }

  // Check if already syncing (with timeout to prevent deadlock)
  const currentSyncState = await getSyncState(campaignSlug)
  if (currentSyncState === 'syncing') {
    // Check if sync has been stuck for too long (more than 10 seconds)
    const db = getDb(campaignSlug)
    const syncStateMeta = await db.metadata.get('syncState')
    const stuckTime = syncStateMeta ? Date.now() - syncStateMeta.updatedAt : 0
    
    if (stuckTime > 10000) {
      await setSyncState(campaignSlug, 'idle')
    } else {
      return
    }
  }

  try {
    await setSyncState(campaignSlug, 'syncing')

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
        await setSyncState(campaignSlug, 'error')
        return                     // keep changes for the next attempt
      }
    }
    
    // 2. pull fresh nodes
    const lastNode = (await db.nodes.orderBy('updatedAt').last())?.updatedAt ?? 0;
    const freshNodes = await authFetch(
      `${API}/${campaignSlug}/nodes/since/${lastNode}`,
      { headers: { 'Content-Type':'application/json'} }
    ).then(r => r.json());
    if (freshNodes.length) await db.nodes.bulkPut(freshNodes);
    
    // 3. pull fresh edges
    const lastEdge = (await db.edges.orderBy('updatedAt').last())?.updatedAt ?? 0;
    const freshEdges = await authFetch(
      `${API}/${campaignSlug}/edges/since/${lastEdge}`,
      { headers: { 'Content-Type':'application/json' } }
    ).then(r => r.json());

    const camelEdges = freshEdges.map(edgeSnakeToCamel);

    if (freshEdges.length) await db.edges.bulkPut(camelEdges);
    
    // 4. pull fresh folders
    const lastFolder = (await db.folders.orderBy('updatedAt').last())?.updatedAt ?? 0;
    const freshFolders = await authFetch(
      `${API}/${campaignSlug}/folders/since/${lastFolder}`,
      { headers: { 'Content-Type':'application/json' } }
    ).then(r => r.json());

    if (freshFolders.length) await db.folders.bulkPut(freshFolders);

    // 5. pull fresh chat sessions
    const lastChat = (await db.chats.orderBy('updatedAt').last())?.updatedAt ?? 0;
    const freshChats = await authFetch(
      `${API}/${campaignSlug}/chats/since/${lastChat}`,
      { headers: { 'Content-Type':'application/json' } }
    ).then(r => r.json());

    if (freshChats.length) await db.chats.bulkPut(freshChats);

    // 6. pull fresh chat messages
    const lastChatMessage = (await db.chatMessages.orderBy('createdAt').last())?.createdAt ?? 0;
    const freshChatMessages = await authFetch(
      `${API}/${campaignSlug}/chat-messages/since/${lastChatMessage}`,
      { headers: { 'Content-Type':'application/json' } }
    ).then(r => r.json());

    if (freshChatMessages.length) await db.chatMessages.bulkPut(freshChatMessages);

    await setSyncState(campaignSlug, 'idle')
  } catch (error) {
    console.error('Sync failed:', error)
    await setSyncState(campaignSlug, 'error')
  }
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