// src/components/editor/EditorBubbleMenu.tsx
'use client'

import { BubbleMenu, Editor } from '@tiptap/react'
import React, { useState } from 'react' // useState importieren
import { Bold, Italic, Strikethrough, Code, Edit3, Loader2 } from 'lucide-react'; // Edit3 für Umschreiben, Loader2 für Ladeanimation
import { generateSimpleText } from '@/services/llmService'; // Stelle sicher, dass der Pfad korrekt ist

interface EditorBubbleMenuProps {
  editor: Editor | null // Editor kann null sein, wenn useEditor noch nicht initialisiert ist
}

const EditorBubbleMenu: React.FC<EditorBubbleMenuProps> = ({ editor }) => {
  const [isAiLoading, setIsAiLoading] = useState(false); // State für den Ladezustand

  if (!editor) {
    return null
  }

  const handleRewriteText = async () => {
    if (editor.state.selection.empty) {
      alert("Bitte markiere zuerst Text, der umgeschrieben werden soll.");
      return;
    }

    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to, " ");

    if (!selectedText.trim()) {
      alert("Kein Text markiert zum Umschreiben.");
      return;
    }

    setIsAiLoading(true);

    // Sehr einfacher Prompt für den PoC
    // Passe diesen Prompt an, um bessere Ergebnisse zu erzielen
    const prompt = `Schreibe den folgenden Text prägnanter und klarer um. Gib nur den umgeschriebenen Text zurück, ohne zusätzliche Kommentare, Einleitungen oder Formatierungen wie Markdown:\n\nOriginaltext:\n"${selectedText}"\n\nUmschreibung:`;

    try {
      // Hier wird generateSimpleText aufgerufen.
      // Wenn du die Langchain-Version mit Temperature etc. im Frontend steuern willst,
      // müsstest du hier ggf. weitere Parameter übergeben.
      const rewrittenText = await generateSimpleText(prompt);

      if (rewrittenText && !rewrittenText.toLowerCase().startsWith("fehler:")) {
        editor.chain().focus().deleteSelection().insertContent(rewrittenText.trim()).run();
      } else {
        // Zeige die Fehlermeldung vom Service an
        alert(rewrittenText || "Keine Antwort von der KI erhalten.");
      }
    } catch (e: any) {
      console.error("Unerwarteter Fehler im BubbleMenu beim Aufruf der KI:", e);
      alert(`Ein unerwarteter Fehler ist aufgetreten: ${e?.message || 'Unbekannt'}`);
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <BubbleMenu 
      editor={editor} 
      tippyOptions={{ duration: 100, placement: 'top-start' }} // placement nach Bedarf anpassen
      // PluginKey, um mehrere BubbleMenus zu ermöglichen, falls nötig (optional)
      // pluginKey="textFormattingBubbleMenu" 
      className="flex bg-white rounded-lg shadow-lg border border-gray-200 p-1 space-x-0.5" // space-x für etwas Abstand
    >
      {/* Formatierungsbuttons */}
      <button
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={`p-2 h-9 w-9 flex items-center justify-center rounded ${
          editor.isActive('bold') 
            ? 'bg-slate-700 text-white' // Angepasste Farben für Aktiv-Zustand
            : 'hover:bg-slate-100 text-slate-700'
        }`}
        title="Fett"
        type="button"
      >
        <Bold className="w-4 h-4" />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={`p-2 h-9 w-9 flex items-center justify-center rounded ${
          editor.isActive('italic') 
            ? 'bg-slate-700 text-white' 
            : 'hover:bg-slate-100 text-slate-700'
        }`}
        title="Kursiv"
        type="button"
      >
        <Italic className="w-4 h-4" />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleStrike().run()}
        className={`p-2 h-9 w-9 flex items-center justify-center rounded ${
          editor.isActive('strike') 
            ? 'bg-slate-700 text-white' 
            : 'hover:bg-slate-100 text-slate-700'
        }`}
        title="Durchgestrichen"
        type="button"
      >
        <Strikethrough className="w-4 h-4" />
      </button>
      
      {/* Trennlinie */}
      <span className="border-l border-gray-300 mx-1 h-6 self-center"></span> 

      <button
        onClick={() => editor.chain().focus().toggleCode().run()}
        className={`p-2 h-9 w-9 flex items-center justify-center rounded ${
          editor.isActive('code') 
            ? 'bg-slate-700 text-white' 
            : 'hover:bg-slate-100 text-slate-700'
        }`}
        title="Code"
        type="button"
      >
        <Code className="w-4 h-4" />
      </button>

      {/* Trennlinie vor KI-Button */}
      <span className="border-l border-gray-300 mx-1 h-6 self-center"></span>

      {/* KI Umschreiben Button */}
      <button
        onClick={handleRewriteText}
        disabled={isAiLoading || editor.state.selection.empty} // Deaktivieren bei Laden oder keiner Auswahl
        className={`p-2 h-9 w-9 flex items-center justify-center rounded text-purple-600
                    ${editor.state.selection.empty ? 'opacity-50 cursor-not-allowed' : 'hover:bg-purple-100'}
                    ${isAiLoading ? 'cursor-wait' : ''}`}
        title="Text umschreiben (KI)"
        type="button"
      >
        {isAiLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Edit3 className="w-4 h-4" />
        )}
      </button>
    </BubbleMenu>
  )
}

export default EditorBubbleMenu