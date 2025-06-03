// src/components/editor/Tiptap.tsx
'use client'

import { useEditor, EditorContent, Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import React from 'react'
import EditorBubbleMenu from './EditorBubbleMenu' // Stelle sicher, dass dies der korrekte Pfad ist
import EditorToolbar from './EditorToolbar'     // Stelle sicher, dass dies der korrekte Pfad ist

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
        Markieren Sie Text und klicken Sie auf den "Umschreiben"-Button (Stift-Icon) im erscheinenden Menü, um ihn mit KI zu bearbeiten.
      </p>
    `,
  })

  if (!editor) {
    return null
  }

  return (
    <div className="w-full h-full flex flex-col">
      <EditorToolbar editor={editor} />
      
      {/* 
        Fehlerbehebung: tippyOptions hier entfernen, da sie 
        bereits in EditorBubbleMenu.tsx für die Tiptap <BubbleMenu> Komponente
        gesetzt werden.
      */}
      <EditorBubbleMenu editor={editor} /> 
      
      <EditorContent 
        editor={editor} 
        className="flex-grow border border-gray-300 rounded-md p-4 overflow-y-auto prose prose-sm max-w-none focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent" 
      />
    </div>
  )
}

export default Tiptap