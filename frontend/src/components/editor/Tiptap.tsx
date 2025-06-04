// src/components/editor/Tiptap.tsx
'use client'

import { useEditor, EditorContent, Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import React from 'react'
import EditorBubbleMenu from './EditorBubbleMenu'
import EditorToolbar from './EditorToolbar'
import Citation from './extensions/CitationNode' // Importiere den Custom Node

const Tiptap: React.FC = () => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Citation, // Registriere den Citation Node
    ],
    content: `
      <h2>PaperPilot Text Editor</h2>
      <p>
        Willkommen zu Ihrem Text-Editor! Wählen Sie etwas Text aus, um das Formatierungsmenü anzuzeigen.
      </p>
      <p>
        Markieren Sie Text und klicken Sie auf den "Umschreiben"-Button (Stift-Icon) oder "Quelle suchen"-Button (Buch-Icon) im erscheinenden Menü.
      </p>
      <p>Beispiel einer Zitation: <span data-citation data-chunk-id="test1" data-display-text="(Autor, 2023, S. 12)">Autor, 2023, S. 12</span>. So könnte es aussehen.</p>
    `,
    // Optional: Editor-Callbacks für Debugging oder erweiterte Logik
    // onUpdate: ({ editor }) => {
    //   console.log("Editor HTML:", editor.getHTML());
    //   console.log("Editor JSON:", editor.getJSON());
    // },
  })

  if (!editor) {
    return null
  }

  return (
    <div className="w-full h-full flex flex-col relative"> {/* relative für Popover-Positionierung */}
      <EditorToolbar editor={editor} />
      
      {/* EditorBubbleMenu rendert jetzt auch das SourceSelectionPopover bei Bedarf */}
      <EditorBubbleMenu editor={editor} /> 
      
      <EditorContent 
        editor={editor} 
        className="flex-grow border border-gray-300 rounded-md p-4 overflow-y-auto prose prose-sm max-w-none focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent" 
      />
    </div>
  )
}

export default Tiptap