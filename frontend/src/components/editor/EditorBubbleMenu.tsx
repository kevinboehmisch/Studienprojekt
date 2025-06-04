// src/components/editor/EditorBubbleMenu.tsx
'use client'

import { BubbleMenu, Editor, BubbleMenuProps } from '@tiptap/react'
import React, { useState, useEffect } from 'react'
import { Bold, Italic, Strikethrough, Code, Edit3, Loader2, BookMarked, Sparkles } from 'lucide-react'; // Sparkles für Texterweiterung
import {
    generateSimpleText,      // Für Umschreiben
    findSimilarSources,      // Für Quellensuche
    extendTextWithLLM,       // NEU: Für Texterweiterung
    SourceChunk
} from '@/services/llmService'; // Stelle sicher, dass der Pfad und die Exporte korrekt sind
import SourceSelectionPopover from './SourceSelectionPopover'; // Stelle sicher, dass der Pfad korrekt ist

interface EditorBubbleMenuProps {
  editor: Editor | null;
}

const EditorBubbleMenu: React.FC<EditorBubbleMenuProps> = ({ editor }) => {
  const [isAiLoading, setIsAiLoading] = useState(false); // Für "Umschreiben"
  const [isAiExtending, setIsAiExtending] = useState(false); // NEU: Für "Text erweitern"
  const [isSourceLoading, setIsSourceLoading] = useState(false); // Für "Quellen suchen"

  const [foundSources, setFoundSources] = useState<SourceChunk[]>([]);
  const [showSourcePopover, setShowSourcePopover] = useState(false);
  const [popoverPosition, setPopoverPosition] = useState<{ top: number; left: number } | null>(null);
  const [selectedRangeForCitation, setSelectedRangeForCitation] = useState<{ from: number; to: number } | null>(null);

  if (!editor) {
    return null;
  }

  // Handler für Text umschreiben
  const handleRewriteText = async () => {
    if (!editor || editor.state.selection.empty) {
      alert("Bitte markiere zuerst Text, der umgeschrieben werden soll.");
      return;
    }

    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to, " ");
    const trimmedSelectedText = selectedText.trim();

    if (!trimmedSelectedText) {
      alert("Kein Text markiert zum Umschreiben.");
      return;
    }

    setIsAiLoading(true);
    // Prompt für das Umschreiben
    const prompt = `Schreibe den folgenden Text prägnanter und klarer um. Gib nur den umgeschriebenen Text zurück, ohne zusätzliche Kommentare, Einleitungen oder Formatierungen wie Markdown:\n\nOriginaltext:\n"${trimmedSelectedText}"\n\nUmschreibung:`;

    try {
      // Nutze generateSimpleText für das Umschreiben
      const rewrittenText = await generateSimpleText(prompt);
      if (rewrittenText && !rewrittenText.toLowerCase().startsWith("fehler:")) {
        editor.chain().focus().deleteSelection().insertContent(rewrittenText.trim()).run();
      } else {
        alert(rewrittenText || "Keine Antwort von der KI erhalten.");
      }
    } catch (e: any) {
      console.error("Unerwarteter Fehler im BubbleMenu beim Aufruf der KI (Umschreiben):", e);
      alert(`Ein unerwarteter Fehler ist aufgetreten: ${e?.message || 'Unbekannt'}`);
    } finally {
      setIsAiLoading(false);
    }
  };

  // NEU: Handler für Text erweitern
  const handleExtendText = async () => {
    if (!editor || editor.state.selection.empty) {
      alert("Bitte markiere zuerst Text, der erweitert werden soll.");
      return;
    }

    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to, " ");
    const trimmedSelectedText = selectedText.trim();

    if (!trimmedSelectedText) {
      alert("Kein Text markiert zum Erweitern.");
      return;
    }

    setIsAiExtending(true);
    try {
      // Nutze die neue extendTextWithLLM Funktion
      const extendedContent = await extendTextWithLLM(trimmedSelectedText);
      if (extendedContent && !extendedContent.toLowerCase().startsWith("fehler:")) {
        // Füge den Text HINTER der aktuellen Selektion ein.
        // Ein Leerzeichen voranstellen, falls die KI keins liefert und es benötigt wird.
        editor.chain().focus().setTextSelection(to).insertContent(` ${extendedContent.trim()}`).run();
      } else {
        alert(extendedContent || "Keine Antwort von der KI für die Texterweiterung erhalten.");
      }
    } catch (e: any) {
      console.error("Fehler im BubbleMenu beim Erweitern des Textes:", e);
      alert(`Ein Fehler ist beim Erweitern des Textes aufgetreten: ${e?.message || 'Unbekannt'}`);
    } finally {
      setIsAiExtending(false);
    }
  };

  // Handler für Quellensuche
  const handleFindSources = async () => {
    if (!editor || editor.state.selection.empty) {
      alert("Bitte markiere zuerst Text, für den Quellen gesucht werden sollen.");
      return;
    }

    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to, " ");
    const trimmedSelectedText = selectedText.trim();

    if (!trimmedSelectedText) {
        alert("Kein Text markiert oder nur Leerzeichen für die Quellensuche.");
        return;
    }

    setIsSourceLoading(true);
    setShowSourcePopover(false);
    setPopoverPosition(null);

    try {
      const sources = await findSimilarSources(trimmedSelectedText, 5);
      setFoundSources(sources);

      if (sources && sources.length > 0) {
        setSelectedRangeForCitation({ from, to });
        const bubbleMenuPopperElement = editor.view.dom.closest('.tippy-popper');
        let newCalculatedPosition: { top: number; left: number } | null = null;

        if (bubbleMenuPopperElement) {
            const rect = bubbleMenuPopperElement.getBoundingClientRect();
            newCalculatedPosition = {
                top: rect.bottom + window.scrollY + 5,
                left: rect.left + window.scrollX
            };
        } else {
            const selectionCoords = editor.view.coordsAtPos(from);
            newCalculatedPosition = {
                top: selectionCoords.bottom + window.scrollY + 5,
                left: selectionCoords.left + window.scrollX
            };
        }
        setPopoverPosition(newCalculatedPosition);
      } else {
        alert("Keine passenden Quellen gefunden.");
        setFoundSources([]);
        setShowSourcePopover(false);
        setPopoverPosition(null);
      }
    } catch (e: any) {
      console.error("Fehler bei der Quellensuche im BubbleMenu:", e);
      alert(`Fehler bei der Quellensuche: ${e?.message || 'Unbekannt'}`);
      setShowSourcePopover(false);
      setPopoverPosition(null);
      setFoundSources([]);
    } finally {
      setIsSourceLoading(false);
    }
  };

  // useEffect, um das Popover anzuzeigen
  useEffect(() => {
    if (popoverPosition && foundSources && foundSources.length > 0) {
      setShowSourcePopover(true);
    } else if (!popoverPosition && showSourcePopover) {
      setShowSourcePopover(false);
    }
  }, [popoverPosition, foundSources, showSourcePopover]);

  // Handler zur Auswahl einer Quelle
  const handleSelectSource = (source: SourceChunk) => {
    if (!editor) return;

    const author = source.document_author || 'Unbekannt';
    const year = source.publication_year || 'N/A';
    const page = source.page_number !== null ? `S. ${source.page_number + 1}` : ''; // Annahme: page_number ist 0-basiert

    let displayText = `(${author}, ${year}`;
    if (page) {
      displayText += `, ${page}`;
    }
    displayText += ") "; // Leerzeichen am Ende

    const commandChain = editor.chain().focus();
    if (selectedRangeForCitation) {
      commandChain.setTextSelection(selectedRangeForCitation.to);
      commandChain.insertCitation({ chunkId: source.chunk_id, displayText }).run();
    } else {
      commandChain.insertCitation({ chunkId: source.chunk_id, displayText }).run();
    }

    setShowSourcePopover(false);
    setFoundSources([]);
    setSelectedRangeForCitation(null);
    setPopoverPosition(null);
  };

  // useEffect für Klick außerhalb des Popovers
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const popoverElement = document.querySelector('#source-selection-popover');
      const triggerButton = (event.target as HTMLElement).closest('button[title="Passende Quelle suchen"]');
      if (triggerButton) return;

      if (showSourcePopover && popoverElement && !popoverElement.contains(event.target as Node)) {
        setShowSourcePopover(false);
        // Optional: setPopoverPosition(null); setFoundSources([]);
      }
    };

    if (showSourcePopover) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSourcePopover]);

  const tippyOptions: BubbleMenuProps['tippyOptions'] = {
    duration: 100,
    placement: 'top-start',
  };

  // Gemeinsame Deaktivierungslogik für KI-Buttons
  const isAnyAiActionDisabled = !editor || editor.state.selection.empty || isAiLoading || isAiExtending || isSourceLoading;


  return (
    <>
      <BubbleMenu
        editor={editor}
        tippyOptions={tippyOptions}
        shouldShow={({ editor: currentEditor, from, to }) => {
            // Zeige das Menü nur, wenn tatsächlich Text ausgewählt ist (nicht nur ein Cursor)
            return from !== to;
        }}
        className="flex bg-white rounded-lg shadow-lg border border-gray-200 p-1 space-x-0.5"
      >
        {/* Fett */}
        <button
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`p-2 h-9 w-9 flex items-center justify-center rounded ${
            editor.isActive('bold') ? 'bg-slate-700 text-white' : 'hover:bg-slate-100 text-slate-700'}`}
            title="Fett" type="button" >
            <Bold className="w-4 h-4" />
        </button>
        {/* Kursiv */}
        <button
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`p-2 h-9 w-9 flex items-center justify-center rounded ${
            editor.isActive('italic') ? 'bg-slate-700 text-white' : 'hover:bg-slate-100 text-slate-700'}`}
            title="Kursiv" type="button" >
            <Italic className="w-4 h-4" />
        </button>
        {/* Durchgestrichen */}
        <button
            onClick={() => editor.chain().focus().toggleStrike().run()}
            className={`p-2 h-9 w-9 flex items-center justify-center rounded ${
            editor.isActive('strike') ? 'bg-slate-700 text-white' : 'hover:bg-slate-100 text-slate-700'}`}
            title="Durchgestrichen" type="button" >
            <Strikethrough className="w-4 h-4" />
        </button>
        <span className="border-l border-gray-300 mx-1 h-6 self-center"></span>
        {/* Code */}
        <button
            onClick={() => editor.chain().focus().toggleCode().run()}
            className={`p-2 h-9 w-9 flex items-center justify-center rounded ${
            editor.isActive('code') ? 'bg-slate-700 text-white' : 'hover:bg-slate-100 text-slate-700'}`}
            title="Code" type="button" >
            <Code className="w-4 h-4" />
        </button>
        <span className="border-l border-gray-300 mx-1 h-6 self-center"></span>

        {/* KI Umschreiben Button */}
        <button
            onClick={handleRewriteText}
            disabled={isAnyAiActionDisabled || isAiExtending} // Deaktiviert, wenn eine andere KI-Aktion läuft
            className={`p-2 h-9 w-9 flex items-center justify-center rounded text-purple-600
                        ${isAnyAiActionDisabled || isAiExtending ? 'opacity-50 cursor-not-allowed' : 'hover:bg-purple-100'}
                        ${isAiLoading ? 'cursor-wait' : ''}`}
            title="Text umschreiben (KI)" type="button" >
            {isAiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Edit3 className="w-4 h-4" />}
        </button>

        {/* NEUER Button für Texterweiterung */}
        <button
            onClick={handleExtendText}
            disabled={isAnyAiActionDisabled || isAiLoading} // Deaktiviert, wenn eine andere KI-Aktion läuft
            className={`p-2 h-9 w-9 flex items-center justify-center rounded text-green-600
                        ${isAnyAiActionDisabled || isAiLoading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-green-100'}
                        ${isAiExtending ? 'cursor-wait' : ''}`}
            title="Text erweitern (KI)" type="button" >
            {isAiExtending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
        </button>

        <span className="border-l border-gray-300 mx-1 h-6 self-center"></span>
        {/* Button für Quellensuche */}
        <button
          onClick={handleFindSources}
          disabled={isAnyAiActionDisabled || isAiLoading || isAiExtending} // Deaktiviert, wenn eine andere KI-Aktion läuft
          className={`p-2 h-9 w-9 flex items-center justify-center rounded text-blue-600
                      ${isAnyAiActionDisabled || isAiLoading || isAiExtending ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-100'}
                      ${isSourceLoading ? 'cursor-wait' : ''}`}
          title="Passende Quelle suchen" type="button" >
          {isSourceLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <BookMarked className="w-4 h-4" />}
        </button>
      </BubbleMenu>

      {/* Das Popover für die Quellenauswahl */}
      {showSourcePopover && editor && popoverPosition && foundSources && foundSources.length > 0 && (
        <div
            id="source-selection-popover"
            style={{
                position: 'absolute',
                top: `${popoverPosition.top}px`,
                left: `${popoverPosition.left}px`,
                zIndex: 1000
            }}
        >
            <SourceSelectionPopover
                sources={foundSources}
                onSelectSource={handleSelectSource}
                onClose={() => {
                    setShowSourcePopover(false);
                    setPopoverPosition(null);
                    setFoundSources([]);
                }}
            />
        </div>
      )}
    </>
  )
}

export default EditorBubbleMenu;