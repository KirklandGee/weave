// components/Inspector.tsx
import { useLiveQuery } from 'dexie-react-hooks'
import { getDb } from '@/lib/db/campaignDB'
import type { SidebarNode, Relationship } from '@/types/node'

export default function Inspector({ node }: { node: SidebarNode | null }) {

  const db = getDb()
  // Always call hooks first
  const edges = useLiveQuery<
    { outgoing: Relationship[]; incoming: Relationship[] }
  >(
    () => {
    if (!node?.id) return { outgoing: [], incoming: [] };
    return Promise.all([
      db.edges.where('fromId').equals(node.id).toArray(), // <- fromId
      db.edges.where('toId').equals(node.id).toArray()    // <- toId
    ]).then(([outgoing, incoming]) => ({ outgoing, incoming }));
  },
  [node?.id]
  )

  if (!node) return null
  if (!Object.keys(node.attributes ?? {}).length && !node.id) return null

  return (
    <aside className="w-64 shrink-0 border-l border-zinc-800 px-4 py-3 text-sm text-zinc-300">
      <h4 className="mb-2 font-semibold text-zinc-100">Attributes</h4>
      <ul className="space-y-1 mb-4">
        {Object.entries(node.attributes).map(([k, v]) => (
          <li key={k} className="flex justify-between">
            <span>{k}</span>
            <span className="text-zinc-200">{String(v)}</span>
          </li>
        ))}
      </ul>
      <h4 className="mb-2 font-semibold text-zinc-100">Relationships</h4>
      <ul className="space-y-1">
        {/* Outgoing edges: node is FROM */}
        {edges?.outgoing?.map(edge => (
          <li key={edge.id} className="flex items-center justify-between">
            <span>
              <span className="text-zinc-400">{edge.relType}</span> → <span className="text-zinc-200">{edge.toTitle}</span>
            </span>
          </li>
        ))}
        {/* Incoming edges: node is TO */}
        {edges?.incoming?.map(edge => (
          <li key={edge.id} className="flex items-center justify-between">
            <span>
              <span className="text-zinc-200">{edge.fromTitle}</span> <span className="text-zinc-400">← {edge.relType}</span>
            </span>
          </li>
        ))}
        {(!edges?.outgoing?.length && !edges?.incoming?.length) && (
          <li className="text-zinc-500">No relationships</li>
        )}
      </ul>
    </aside>
  )
}