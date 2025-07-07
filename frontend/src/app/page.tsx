"use client";

import { useState } from "react";
import Tiptap from "../components/Tiptap";
import Sidebar from "@/components/Sidebar";   // ← default import

type Node = { id: number; title: string; markdown: string };

const mockNodes: Node[] = [
  { id: 1, title: "Welcome",         markdown: "# Welcome\nThis is **TipTap**." },
  { id: 2, title: "Getting Started", markdown: "## Getting Started\nSome _intro text_." },
  { id: 3, title: "API Reference",   markdown: "# API\n- Method A\n- Method B" },
  { id: 4, title: "Changelog",       markdown: "# Changelog\n1.0.0 – Initial release" },
  { id: 5, title: "License",         markdown: "# License\nMIT" },
];

export default function Home() {
  const [activeId, setActiveId] = useState<number>(mockNodes[0].id);
  const activeNode = mockNodes.find((n) => n.id === activeId)!;

  return (
    <div className="flex h-screen bg-zinc-950">
      <Sidebar
        nodes={mockNodes}
        activeId={activeId}
        onSelect={(node) => setActiveId(node.id)}
      />

      <main className="flex-1 overflow-auto p-4">
        <Tiptap content={activeNode.markdown} />
      </main>
    </div>
  );
}