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
  onTypingStateChange,
}: {
  content: string;
  onContentChange: (md: string) => void;
  onTypingStateChange?: (isTyping: boolean) => void;
}) {
  const localUpdate = useRef<boolean>(false)
  const isTyping = useRef<boolean>(false)
  const typingTimer = useRef<NodeJS.Timeout | null>(null)
  const lastContent = useRef<string>('')

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
      
      // Mark as typing and reset timer
      if (!isTyping.current) {
        isTyping.current = true
        onTypingStateChange?.(true)
      }
      
      if (typingTimer.current) {
        clearTimeout(typingTimer.current)
      }
      typingTimer.current = setTimeout(() => {
        isTyping.current = false
        onTypingStateChange?.(false)
      }, 1000) // Consider typing stopped after 1 second of inactivity
      
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
    
    // Don't update if user is actively typing
    if (isTyping.current) {
      return
    }
    
    // Only update if content actually changed and is different from last known content
    if (content !== lastContent.current && content !== editor.getHTML()) {
      // Save cursor position before updating
      const { from, to } = editor.state.selection
      const isFocused = editor.isFocused
      
      localUpdate.current = true
      lastContent.current = content
      editor.commands.setContent(content, { emitUpdate: false })
      
      // Restore cursor position if editor was focused
      if (isFocused) {
        setTimeout(() => {
          const maxPos = editor.state.doc.content.size
          const safeFrom = Math.min(from, maxPos)
          const safeTo = Math.min(to, maxPos)
          
          if (safeFrom <= maxPos && safeTo <= maxPos) {
            editor.commands.setTextSelection({ from: safeFrom, to: safeTo })
            editor.commands.focus()
          }
        }, 0)
      }
    }
  }, [content, editor])

  /* ---------- 4. clean up ---------- */
  useEffect(() => {
    if (!editor) return

    return () => {
      debouncedSave.cancel()              // kill any pending save
      if (typingTimer.current) {
        clearTimeout(typingTimer.current)
      }
    }
  }, [editor, debouncedSave])

  return (
    <>
      {editor && (
        <BubbleMenu
          editor={editor}
          options={{ placement: 'bottom', offset: 8 }}
          shouldShow={({ editor, state }) => {
            if (!editor.isFocused) return false
            if (editor.isDestroyed) return false
            if (!state.selection || state.selection.empty) return false
            return true
          }
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
        className="overflow-auto prose prose-invert max-w-none whitespace-pre-wrap"
      />
    </>
  );
}