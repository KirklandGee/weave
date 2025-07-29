// components/Inspector.tsx
import type { Note } from '@/types/node'
import { RelationshipsSection } from './Relationships'

type InspectorProps = {
  node: Note | null;
  onNavigateToNote?: (noteId: string) => void;
  onHide?: () => void;
}
// Originally showed some extra attributes, but simplified to just relationships now. may change back at some point
export default function Inspector({ node, onNavigateToNote, onHide }: InspectorProps) {
  if (!node) return null
  if (!Object.keys(node.attributes ?? {}).length && !node.id) return null

  return (
    <aside className="h-full flex flex-col overflow-hidden text-zinc-200">
      <div className="flex-shrink-0 p-3 border-b border-zinc-800 flex items-center justify-between">
        <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wide">Relationships</h3>
        {onHide && (
          <button
            onClick={onHide}
            className="text-zinc-500 hover:text-zinc-300 transition-colors p-1 rounded hover:bg-zinc-800"
            aria-label="Hide inspector"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        )}
      </div>
      
      <div className="flex-1 overflow-y-auto p-3">
        <div className="mb-6">

        <RelationshipsSection
          currentNote={node}
          onNavigateToNote={onNavigateToNote}
        />

        </div>
        
      </div>
    </aside>
  )
}
