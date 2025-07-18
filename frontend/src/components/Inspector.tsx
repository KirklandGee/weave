// components/Inspector.tsx
import type { Note } from '@/types/node'
import { RelationshipsSection } from './Relationships'

type InspectorProps = {
  node: Note | null;
  onNavigateToNote?: (noteId: string) => void;
  onHide?: () => void;
}

export default function Inspector({ node, onNavigateToNote, onHide }: InspectorProps) {
  if (!node) return null
  if (!Object.keys(node.attributes ?? {}).length && !node.id) return null

  // Filter out unwanted attributes: embedding, ownerId, contentHash, embeddedAt
  const filteredAttributes = Object.fromEntries(
    Object.entries(node.attributes ?? {}).filter(
      ([key]) =>
        !['embedding', 'ownerId', 'contentHash', 'embeddedAt', 'campaignId', 'campaignIds'].includes(key)
    )
  );

  return (
    <aside className="h-full flex flex-col overflow-hidden text-sm text-zinc-300">
      <div className="flex-shrink-0 p-4 border-b border-zinc-800 flex items-center justify-between">
        <h4 className="font-semibold text-zinc-100">Inspector</h4>
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
      
      <div className="flex-1 overflow-y-auto p-4">
        <div className="mb-6">
          {Object.keys(filteredAttributes).length > 0 ? (
            <>
              <h5 className="mb-3 font-medium text-zinc-100">Attributes</h5>
              <ul className="space-y-2">
                {Object.entries(filteredAttributes).map(([k, v]) => (
                  <li key={k} className="flex flex-col gap-1">
                    <span className="text-xs font-medium text-zinc-400 uppercase tracking-wide">{k}</span>
                    <span className="text-zinc-200 bg-zinc-800 px-2 py-1 rounded text-sm">
                      {String(v)}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-zinc-500 text-xs italic">No attributes</p>
          )}
        </div>
        
        <RelationshipsSection
          currentNote={node}
          onNavigateToNote={onNavigateToNote}
        />
      </div>
    </aside>
  )
}