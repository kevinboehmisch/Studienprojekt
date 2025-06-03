// src/components/editor/Tiptap.tsx
'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import React from 'react'
import EditorBubbleMenu from './EditorBubbleMenu'
import EditorToolbar from './EditorToolbar'

const Tiptap: React.FC = () => {
  const editor = useEditor({
    extensions: [
      StarterKit,
    ],
    content: `
      <h2>PaperPilot Text Editor</h2>
      <p>
        Willkommen zu Ihrem Text-Editor! Wählen Sie etwas Text aus, um das Formatierungsmenü anzuzeigen.
      </p>
      <p>
        Sie können Inhalte hinzufügen, bearbeiten und formatieren. Das System wird Sie bei Ihrer akademischen Arbeit unterstützen.
      </p>
    `,
  })

  if (!editor) {
    return null
  }

  return (
    <div className="w-full h-full flex flex-col">
      <EditorToolbar editor={editor} />
      
      <EditorBubbleMenu editor={editor} />
      
      <EditorContent 
        editor={editor} 
        className="flex-grow border border-gray-300 rounded-md p-4 overflow-y-auto prose prose-sm max-w-none focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent" 
      />
    </div>
  )
}

export default Tiptap