'use client'

import { useMemo, useRef, useEffect } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import { BubbleMenu } from '@tiptap/react/menus'
import { htmlToMd } from '@/lib/md'
import StarterKit from '@tiptap/starter-kit'
import debounce from 'lodash.debounce'
import React from 'react'

export default function Tiptap({
  content,
  onContentChange,
}: {
  content: string;
  onContentChange: (md: string) => void;
}) {
  const localUpdate = useRef<boolean>(false)

  // create a fresh debouncer every time the callback changes (i.e. node switch)
  const debouncedSave = useMemo(
    () => debounce((html: string) => onContentChange(htmlToMd(html)), 400),
    [onContentChange],
  )

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit],
    content,
    onUpdate({ editor }) {
      if (localUpdate.current) {            // ← ignore our own reset
        localUpdate.current = false
        return
      }
      debouncedSave(editor.getHTML())      // <-- debounce here
    },
    editorProps: {
      attributes: {
        class:
          "text-white prose prose-invert max-w-2xl min-h-[400px] focus:outline-none",
      },
    },
    shouldRerenderOnTransaction: false,
  });

  /* ---------- 3. Dexie -> editor sync ---------- */
  useEffect(() => {
    if (!editor) return
    if (content !== editor.getHTML()) {
      localUpdate.current = true
      editor.commands.setContent(content, { emitUpdate: false })
    }
  }, [content, editor])

  /* ---------- 4. clean up ---------- */
  useEffect(() => {
    if (!editor) return

    const updateHandler = () => {
      // this branch only runs if localUpdate was false
      debouncedSave(editor.getHTML())
    }

    editor.on('update', updateHandler)

    return () => {
      editor.off('update', updateHandler) // remove listener
      debouncedSave.cancel()              // kill any pending save
    }
  }, [editor, debouncedSave])

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
        className="prose prose-invert max-w-none whitespace-pre-wrap"
      />
    </>
  );
}