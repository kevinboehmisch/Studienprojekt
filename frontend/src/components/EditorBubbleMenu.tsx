// src/components/editor/EditorBubbleMenu.tsx
'use client'

import { BubbleMenu, Editor } from '@tiptap/react'
import React from 'react'

interface EditorBubbleMenuProps {
  editor: Editor
}

const EditorBubbleMenu: React.FC<EditorBubbleMenuProps> = ({ editor }) => {
  if (!editor) {
    return null
  }

  return (
    <BubbleMenu 
      editor={editor} 
      tippyOptions={{ duration: 100 }}
      className="flex bg-white rounded-lg shadow-lg border border-gray-200 p-1"
    >
      <button
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={`h-8 w-8 flex items-center justify-center rounded ${
          editor.isActive('bold') 
            ? 'bg-blue-500 text-white' 
            : 'hover:bg-gray-100'
        }`}
        title="Fett"
      >
        <strong>B</strong>
      </button>
      <button
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={`h-8 w-8 flex items-center justify-center rounded ${
          editor.isActive('italic') 
            ? 'bg-blue-500 text-white' 
            : 'hover:bg-gray-100'
        }`}
        title="Kursiv"
      >
        <em>I</em>
      </button>
      <button
        onClick={() => editor.chain().focus().toggleStrike().run()}
        className={`h-8 w-8 flex items-center justify-center rounded ${
          editor.isActive('strike') 
            ? 'bg-blue-500 text-white' 
            : 'hover:bg-gray-100'
        }`}
        title="Durchgestrichen"
      >
        <span className="line-through">S</span>
      </button>
      <span className="border-l border-gray-200 mx-1"></span>
      <button
        onClick={() => editor.chain().focus().toggleCode().run()}
        className={`px-2 h-8 flex items-center justify-center rounded text-sm ${
          editor.isActive('code') 
            ? 'bg-blue-500 text-white' 
            : 'hover:bg-gray-100'
        }`}
        title="Code"
      >
        &lt;/&gt;
      </button>
    </BubbleMenu>
  )
}

export default EditorBubbleMenu