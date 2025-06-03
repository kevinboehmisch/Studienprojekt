// src/components/editor/EditorToolbar.tsx
'use client'

import { Editor } from '@tiptap/react'
import React from 'react'

interface EditorToolbarProps {
  editor: Editor
}

const EditorToolbar: React.FC<EditorToolbarProps> = ({ editor }) => {
  if (!editor) {
    return null
  }

  return (
    <div className="flex flex-wrap bg-gray-50 p-2 border-b border-gray-200 mb-2 text-sm">
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        className={`px-2 py-1 rounded ${editor.isActive('heading', { level: 1 }) ? 'bg-blue-100' : ''}`}
      >
        H1
      </button>
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={`px-2 py-1 rounded ml-1 ${editor.isActive('heading', { level: 2 }) ? 'bg-blue-100' : ''}`}
      >
        H2
      </button>
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        className={`px-2 py-1 rounded ml-1 ${editor.isActive('heading', { level: 3 }) ? 'bg-blue-100' : ''}`}
      >
        H3
      </button>
      <span className="border-l border-gray-300 mx-2"></span>
      <button
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={`px-2 py-1 rounded ${editor.isActive('bulletList') ? 'bg-blue-100' : ''}`}
      >
        • Liste
      </button>
      <button
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={`px-2 py-1 rounded ml-1 ${editor.isActive('orderedList') ? 'bg-blue-100' : ''}`}
      >
        1. Liste
      </button>
      <span className="border-l border-gray-300 mx-2"></span>
      <button
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        className={`px-2 py-1 rounded ${editor.isActive('blockquote') ? 'bg-blue-100' : ''}`}
      >
        Zitat
      </button>
      <button
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        className="px-2 py-1 rounded ml-1"
      >
        Trennlinie
      </button>
    </div>
  )
}

export default EditorToolbar