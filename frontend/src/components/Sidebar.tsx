'use client'
import { useState } from 'react'
import type { SidebarNode } from '@/types/node'
import { ChevronDown, ChevronRight } from 'lucide-react' // optional icon lib

export default function Sidebar({
  nodes,
  activeId,
  onSelect,
  onCreate,
  // onDelete
}: {
  nodes: SidebarNode[]
  activeId: string
  onSelect: (node: SidebarNode) => void
  onCreate: () => void
  // onDelete: () => void
}) {
  /* group by type */
  const grouped = nodes.reduce((acc, n) => {
    (acc[n.type] ||= []).push(n)
    return acc
  }, {} as Record<string, SidebarNode[]>)

  /* keep open/closed state per bucket */
  const [open, setOpen] = useState<Record<string, boolean>>({})

  return (
    <aside className="w-60 shrink-0 overflow-y-auto border-r border-zinc-800 px-3 py-4 text-zinc-200">
      <button onClick={onCreate} className="mb-3 w-full text-white bg-blue-500 hover:bg-blue-700 text-sm font-bold py-2 px-4 rounded">
        Add Note
      </button>
      {Object.entries(grouped).map(([type, list]) => {
        const isOpen = open[type] ?? true
        return (
          <section key={type} className="mb-3">
            <button
              onClick={() => setOpen(o => ({ ...o, [type]: !isOpen }))}
              className="flex w-full items-center justify-between font-semibold uppercase tracking-wide text-zinc-400 hover:text-zinc-100"
            >
              <span>{type}</span>
              {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>

            {isOpen && (
              <ul className="mt-1 ml-3 space-y-1">
                {list.map(n => (
                  <li key={n.id}>
                    <button
                      onClick={() => onSelect(n)}
                      className={`w-full truncate text-left text-sm hover:text-white ${
                        n.id === activeId ? 'font-bold text-white' : ''
                      }`}
                    >
                      {n.title}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )
      })}
    </aside>
  )
}