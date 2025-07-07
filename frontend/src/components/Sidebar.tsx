"use client";

import { Node }from '@/app/page'

/** ------------------------------------------------------------------ */
/** Sidebar component                                                  */
/** ------------------------------------------------------------------ */
interface SidebarProps {
  nodes: Node[];
  activeId: number;
  onSelect: (node: Node) => void;
}

export default function Sidebar({ nodes, activeId, onSelect }: SidebarProps) {
  return (
    <aside className="w-64 shrink-0 border-r border-zinc-800 bg-zinc-900 text-sm text-zinc-100">
      <ul className="p-2">
        {nodes.map((node) => (
          <li key={node.id} className="mb-1 last:mb-0">
            <button
              onClick={() => onSelect(node)}
              className={
                "w-full rounded px-2 py-1 text-left hover:bg-zinc-800" +
                (activeId === node.id ? " bg-zinc-800" : "")
              }            >
              {node.title}
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}