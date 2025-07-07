'use client'

import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import React from 'react'
const Tiptap = () => {
  const editor = useEditor({
    extensions: [StarterKit],
      content: '<p>Hello World! 🌎️</p>',
      editorProps: {
        attributes: {
          class: 'text-white prose prose-invert dark:prose-invert max-w-2xl min-h-[400px] focus:outline-none',
        },
      },
  })

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl shadow-lg p-8 mx-auto my-12 max-w-3xl">
      <EditorContent editor={editor} />
    </div>
  )
}

export default Tiptap
