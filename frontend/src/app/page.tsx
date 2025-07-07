"use client";

import { useState } from "react";
import Tiptap from "@/components/Tiptap";
import Sidebar from "@/components/Sidebar";   // ← default import

export type Node = {
  id: number;
  title: string;
  markdown: string;          // store the TipTap JSON, not markdown text
};
const mockNodes: Node[] = [
  { id: 1, title: "Welcome", markdown: "# Welcome \n - this is a list \n **This is bold**" },
  { id: 2, title: "Page 2", markdown: "## H2 \n - this is a list \n **This is bold**" }
];

export default function Home() {
  const [nodes, setNodes] = useState<Node[]>(mockNodes);
  const [activeId, setActiveId] = useState<number>(nodes[0].id);
  const activeNode = nodes.find((n) => n.id === activeId)!;

  // receives HTML from the editor and stores it back into the node list
  function handleContentChange(updatedMarkdown: string) {
    setNodes((prev) =>
      prev.map((n) =>
        n.id === activeId ? { ...n, markdown: updatedMarkdown } : n
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
          content={activeNode.markdown}
          onContentChange={handleContentChange}
        />
      </main>
    </div>
  );
}