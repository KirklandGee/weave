'use client'

import { useEffect } from "react";
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import React from 'react'

export default function Tiptap({ content }: { content: string }) {
  const editor = useEditor({
    extensions: [StarterKit],
    content,
    editorProps: {
      attributes: {
        class: 'text-white prose prose-invert dark:prose-invert max-w-2xl min-h-[400px] focus:outline-none',
      },
    },
})

  // keep external content in sync
  useEffect(() => {
    if (editor && editor.getHTML() !== content) {
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