'use client'

import { useEffect } from "react";
import { EditorContent, JSONContent, useEditor } from '@tiptap/react'
import { BubbleMenu } from '@tiptap/react/menus'
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
    immediatelyRender: false,
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
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  return (
    <>
      {editor && (
        <BubbleMenu 
          editor={editor} 
          options={{ placement: 'bottom', offset: 8 }}
          shouldShow={({ editor, state }) =>
            editor.isFocused && !state.selection.empty
          }        >
          <div className="bubble-menu bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-lg flex p-1">
            <button
              onClick={() => editor.chain().focus().toggleBold().run()}
              className={`bg-transparent rounded-md px-2 py-1 transition hover:bg-zinc-100 dark:hover:bg-zinc-700 ${editor.isActive('bold') ? 'bg-purple-500 text-white hover:bg-purple-600' : ''}`}
            >
              Bold
            </button>
            <button
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className={`bg-transparent rounded-md px-2 py-1 transition hover:bg-zinc-100 dark:hover:bg-zinc-700 ${editor.isActive('italic') ? 'bg-purple-500 text-white hover:bg-purple-600' : ''}`}
            >
              Italic
            </button>
            <button
              onClick={() => editor.chain().focus().toggleStrike().run()}
              className={`bg-transparent rounded-md px-2 py-1 transition hover:bg-zinc-100 dark:hover:bg-zinc-700 ${editor.isActive('strike') ? 'bg-purple-500 text-white hover:bg-purple-600' : ''}`}
            >
              Strike
            </button>
            <button
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              className={`bg-transparent rounded-md px-2 py-1 transition hover:bg-zinc-100 dark:hover:bg-zinc-700 ${editor.isActive('strike') ? 'bg-purple-500 text-white hover:bg-purple-600' : ''}`}
            >
              Blockquote
            </button>
            <button
              onClick={() => editor.chain().focus().toggleList('bulletList', 'listItem').run()}
              className={`bg-transparent rounded-md px-2 py-1 transition hover:bg-zinc-100 dark:hover:bg-zinc-700 ${editor.isActive('strike') ? 'bg-purple-500 text-white hover:bg-purple-600' : ''}`}
            >
              List
            </button>
          </div>
        </BubbleMenu>
      )}
      <EditorContent
        editor={editor}
        className="prose prose-invert max-w-none"
      />
    </>
  );
}

export type { JSONContent };