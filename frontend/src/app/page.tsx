"use client";

import { useState } from "react";
import Tiptap, { type JSONContent } from "@/components/Tiptap";
import Sidebar from "@/components/Sidebar";   // ← default import

export type Node = {
  id: number;
  title: string;
  doc: JSONContent;          // store the TipTap JSON, not markdown text
};
const mockNodes: Node[] = [
  { id: 1, title: "Welcome", doc: { type: "doc", content: [{ type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Welcome" }] }] } },
  { id: 2, title: "Getting Started", doc: { type: "doc", content: [{ type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Getting Started" }] }] } },
  { id: 3, title: "API Reference", doc: { type: "doc", content: [] } },
  { id: 4, title: "Changelog", doc: { type: "doc", content: [] } },
  { id: 5, title: "License", doc: { type: "doc", content: [] } },
];

export default function Home() {
  const [nodes, setNodes] = useState<Node[]>(mockNodes);
  const [activeId, setActiveId] = useState<number>(nodes[0].id);
  const activeNode = nodes.find((n) => n.id === activeId)!;

  // receives JSON from the editor and stores it back into the node list
  function handleContentChange(updatedDoc: JSONContent) {
    setNodes((prev) =>
      prev.map((n) =>
        n.id === activeId ? { ...n, doc: updatedDoc } : n
      )
    );
    // 🔜  TODO: POST `updatedDoc` to your API here (debounced)
  }


  return (
    <div className="flex h-screen bg-zinc-950">
      <Sidebar
        nodes={nodes}
        activeId={activeId}
        onSelect={(node) => setActiveId(node.id)}
      />

      <main className="flex-1 overflow-auto p-4">
        <Tiptap
          content={activeNode.doc}
          onContentChange={handleContentChange}
        />
      </main>
    </div>
  );
}