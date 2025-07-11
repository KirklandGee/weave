// components/Inspector.tsx
import type { SidebarNode } from '@/types/node'
import { RelationshipsSection } from './Relationships'

type InspectorProps = {
  node: SidebarNode | null;
  onNavigateToNote?: (noteId: string) => void;
}

export default function Inspector({ node, onNavigateToNote }: InspectorProps) {
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
      
      <RelationshipsSection
        currentNote={node}
        onNavigateToNote={onNavigateToNote}
      />
    </aside>
  )
}