'use client'

import { useEffect } from "react";
import { EditorContent, JSONContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import React from 'react'

export default function Tiptap({
  content,
  onContentChange,
}: {
  content: JSONContent;
  onContentChange: (doc: JSONContent) => void;
}) {
  const editor = useEditor({
    extensions: [StarterKit],
    content,
    onUpdate({ editor }) {
      onContentChange(editor.getJSON());   // ⬅️ send the doc up
    },
    editorProps: {
      attributes: {
        class:
          "text-white prose prose-invert max-w-2xl min-h-[400px] focus:outline-none",
      },
    },
  });

  // sync external changes (e.g., switching files)
  useEffect(() => {
    if (editor && JSON.stringify(editor.getJSON()) !== JSON.stringify(content)) {
      editor.commands.setContent(content, false);
    }
  }, [content, editor]);

  return (
    <EditorContent
      editor={editor}
      className="prose prose-invert max-w-none"
    />
  );
}

export type { JSONContent };