'use client'
import { useState, useEffect, useRef } from 'react'
import type { SidebarNode } from '@/types/node'
import { ChevronDown, ChevronRight, Trash, Pencil } from 'lucide-react'
import React from 'react'

export default function Sidebar({
  nodes,
  activeId,
  onSelect,
  onCreate,
  onDelete,
  onRename,            // ← NEW
}: {
  nodes: SidebarNode[]
  activeId: string
  onSelect: (node: SidebarNode) => void
  onCreate: () => void
  onDelete: (node: SidebarNode) => void
  onRename: (id: string, title: string) => void    // ← NEW
}) {

  /* ---------- group + accordion state ---------- */
  const grouped = nodes.reduce((acc, n) => {
    (acc[n.type] ||= []).push(n)
    return acc
  }, {} as Record<string, SidebarNode[]>)
  const [open, setOpen] = useState<Record<string, boolean>>({})

  /* ---------- context-menu state ---------- */
  const [menu, setMenu] = useState<{
    id: string
    top: number
    left: number
  } | null>(null)

  /* ---------- rename-inline state ---------- */
  const [renaming, setRenaming] = useState<string | null>(null)
  const renameInput = useRef<HTMLInputElement | null>(null)

  /* focus the rename input when it appears */
  useEffect(() => {
    if (renaming && renameInput.current) renameInput.current.focus()
  }, [renaming])

  /* close menu on escape / outside click */
  useEffect(() => {
    if (!menu) return
    const close = () => setMenu(null)
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setMenu(null)
    window.addEventListener('click', close)
    window.addEventListener('keydown', esc)
    return () => {
      window.removeEventListener('click', close)
      window.removeEventListener('keydown', esc)
    }
  }, [menu])

  /* helper: start rename then hide menu */
  const triggerRename = (id: string) => {
    setMenu(null)
    setRenaming(id)
  }

  return (
    <aside className="w-60 shrink-0 overflow-y-auto border-r border-zinc-800 px-3 py-4 text-zinc-200">
      <button
        onClick={onCreate}
        className="mb-3 w-full text-white bg-blue-500 hover:bg-blue-700 text-sm font-bold py-2 px-4 rounded"
      >
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
                  <li key={n.id} className="relative">
                    {/* ---------- normal / rename view ---------- */}
                    {renaming === n.id ? (
                      <input
                        aria-label='Rename note'
                        ref={renameInput}
                        defaultValue={n.title}
                        className="w-full rounded bg-zinc-900 px-1 text-sm text-white outline-none"
                        onBlur={e => {
                          const v = e.currentTarget.value.trim()
                          if (v && v !== n.title) onRename(n.id, v)
                          setRenaming(null)
                        }}
                        onKeyDown={e => {
                          if (e.key === 'Enter') e.currentTarget.blur()
                          if (e.key === 'Escape') {
                            e.preventDefault()
                            setRenaming(null)
                          }
                        }}
                      />
                    ) : (
                      <button
                        onClick={() => onSelect(n)}
                        onContextMenu={e => {
                          e.preventDefault()
                          const rect = e.currentTarget.getBoundingClientRect()
                          setMenu({
                            id: n.id,
                            top: rect.top + rect.height / 2,
                            left: rect.right,
                          })
                        }}
                        className={`w-full truncate text-left text-sm hover:text-white ${n.id === activeId ? 'font-bold text-white' : ''
                          }`}
                      >
                        {n.title}
                      </button>
                    )}

                    {/* ---------- pop-up menu ---------- */}
                    {menu && menu.id === n.id && (
                      <div
                        className="fixed z-50"
                        style={{
                          top: `${menu.top}px`,
                          left: `${menu.left + 8}px`,
                          transform: 'translateY(-50%)',
                        }}
                        /* stop both click & mousedown so outside-click
                           handler won’t run before our buttons */
                        onMouseDown={e => e.stopPropagation()}
                        onClick={e => e.stopPropagation()}
                      >
                        <div className="flex items-center gap-2 bg-zinc-800 border border-zinc-700 rounded-lg shadow-lg p-2">
                          {/* rename */}
                          <button
                            title="Rename"
                            onClick={() => triggerRename(n.id)}
                            className="hover:bg-zinc-700 rounded-full p-1 transition-colors"
                          >
                            <Pencil size={18} className="text-zinc-300" />
                          </button>
                          {/* delete */}
                          <button
                            title="Delete"
                            onClick={() => {
                              onDelete(n)
                              setMenu(null)
                            }}
                            className="hover:bg-red-600 rounded-full p-1 transition-colors"
                          >
                            <Trash size={18} className="text-red-400" />
                          </button>
                        </div>
                      </div>
                    )}
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