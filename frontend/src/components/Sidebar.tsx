'use client'
import { useState, useEffect, useRef } from 'react'
import type { Note } from '@/types/node'
import { ChevronDown, ChevronRight, Trash, Pencil } from 'lucide-react'
import React from 'react'

export default function Sidebar({
  nodes,
  activeId,
  onSelect,
  onCreate,
  onDelete,
  onRename,
  onHide,
}: {
  nodes: Note[]
  activeId: string
  onSelect: (node: Note) => void
  onCreate: () => void
  onDelete: (node: Note) => void
  onRename: (id: string, title: string) => void
  onHide?: () => void
}) {

  /* ---------- group + accordion state ---------- */
  const grouped = nodes.reduce((acc, n) => {
    (acc[n.type] ||= []).push(n)
    return acc
  }, {} as Record<string, Note[]>)
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
    <aside className="h-full flex flex-col overflow-hidden text-zinc-200">
      <div className="flex-shrink-0 p-3 border-b border-zinc-800 flex items-center justify-between">
        <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wide">Notes</h3>
        {onHide && (
          <button
            onClick={onHide}
            className="text-zinc-500 hover:text-zinc-300 transition-colors p-1 rounded hover:bg-zinc-800"
            aria-label="Hide sidebar"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        )}
      </div>
      
      <div className="flex-shrink-0 p-3 border-b border-zinc-800">
        <button
          onClick={onCreate}
          className="w-full text-white bg-blue-500 hover:bg-blue-700 text-sm font-bold py-2 px-4 rounded transition-colors"
        >
          Add Note
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {Object.entries(grouped).map(([type, list]) => {
          const isOpen = open[type] ?? true
          return (
            <section key={type} className="mb-4">
              <button
                onClick={() => setOpen(o => ({ ...o, [type]: !isOpen }))}
                className="flex w-full items-center justify-between font-semibold uppercase tracking-wide text-zinc-400 hover:text-zinc-100 transition-colors"
              >
                <span className="text-xs">{type}</span>
                {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>

              {isOpen && (
                <ul className="mt-2 ml-2 space-y-1">
                  {list.map(n => (
                    <li key={n.id} className="relative">
                      {/* ---------- normal / rename view ---------- */}
                      {renaming === n.id ? (
                        <input
                          aria-label='Rename note'
                          ref={renameInput}
                          defaultValue={n.title}
                          className="w-full rounded bg-zinc-800 px-2 py-1 text-sm text-white outline-none border border-zinc-600 focus:border-blue-500"
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
                          className={`w-full truncate text-left text-sm px-2 py-1 rounded transition-colors ${
                            n.id === activeId 
                              ? 'bg-blue-600 text-white font-medium' 
                              : 'hover:bg-zinc-800 hover:text-white'
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
                             handler won't run before our buttons */
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
                              <Pencil size={16} className="text-zinc-300" />
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
                              <Trash size={16} className="text-red-400" />
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
      </div>
    </aside>
  )
}