// src/components/editor/EditorBubbleMenu.tsx
'use client'

import { BubbleMenu, Editor, BubbleMenuProps } from '@tiptap/react'
import React, { useState, useEffect } from 'react'
import { Bold, Italic, Strikethrough, Code, Edit3, Loader2, BookMarked } from 'lucide-react';
import { generateSimpleText, findSimilarSources, SourceChunk } from '@/services/llmService'; // Stelle sicher, dass der Pfad korrekt ist
import SourceSelectionPopover from './SourceSelectionPopover'; // Stelle sicher, dass der Pfad korrekt ist

interface EditorBubbleMenuProps {
  editor: Editor | null
}

const EditorBubbleMenu: React.FC<EditorBubbleMenuProps> = ({ editor }) => {
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isSourceLoading, setIsSourceLoading] = useState(false);
  const [foundSources, setFoundSources] = useState<SourceChunk[]>([]);
  const [showSourcePopover, setShowSourcePopover] = useState(false);
  const [popoverPosition, setPopoverPosition] = useState<{ top: number; left: number } | null>(null);
  const [selectedRangeForCitation, setSelectedRangeForCitation] = useState<{from: number, to: number} | null>(null);

  if (!editor) {
    return null
  }

  // Deine ursprüngliche handleRewriteText Funktion
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
    const prompt = `Schreibe den folgenden Text prägnanter und klarer um. Gib nur den umgeschriebenen Text zurück, ohne zusätzliche Kommentare, Einleitungen oder Formatierungen wie Markdown:\n\nOriginaltext:\n"${trimmedSelectedText}"\n\nUmschreibung:`;

    try {
      const rewrittenText = await generateSimpleText(prompt);
      if (rewrittenText && !rewrittenText.toLowerCase().startsWith("fehler:")) {
        editor.chain().focus().deleteSelection().insertContent(rewrittenText.trim()).run();
      } else {
        alert(rewrittenText || "Keine Antwort von der KI erhalten.");
      }
    } catch (e: any) {
      console.error("Unerwarteter Fehler im BubbleMenu beim Aufruf der KI:", e);
      alert(`Ein unerwarteter Fehler ist aufgetreten: ${e?.message || 'Unbekannt'}`);
    } finally {
      setIsAiLoading(false);
    }
  };

  // Funktion für die Quellensuche
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
    setShowSourcePopover(false); // Erstmal schließen, Position wird neu berechnet
    setPopoverPosition(null);    // Position zurücksetzen

    try {
      const sources = await findSimilarSources(trimmedSelectedText, 5);
      console.log('[EditorBubbleMenu] Gefundene Quellen:', sources);
      setFoundSources(sources); // Wichtig: Quellen setzen, auch wenn Popover noch nicht sichtbar

      if (sources && sources.length > 0) {
        setSelectedRangeForCitation({ from, to });

        // WICHTIG: Überprüfe diese Klasse im Inspektor!
        // Mögliche Kandidaten: '.tippy-popper', '.tippy-content', oder eine spezifischere von Tiptap/Tippy.
        const bubbleMenuPopperElement = editor.view.dom.closest('.tippy-popper');
        console.log('[EditorBubbleMenu] bubbleMenuPopperElement (suche nach .tippy-popper):', bubbleMenuPopperElement);

        let newCalculatedPosition: { top: number; left: number } | null = null;

        if (bubbleMenuPopperElement) {
            const rect = bubbleMenuPopperElement.getBoundingClientRect();
            console.log('[EditorBubbleMenu] bubbleMenuPopperElement rect:', rect);
            newCalculatedPosition = {
                top: rect.bottom + window.scrollY + 5, // 5px unter dem Popper
                left: rect.left + window.scrollX     // Bündig mit linker Kante des Poppers
            };
        } else {
            console.warn('[EditorBubbleMenu] Popper-Element des BubbleMenu nicht gefunden, verwende Fallback-Positionierung relativ zur Selektion.');
            const selectionCoords = editor.view.coordsAtPos(from);
            console.log('[EditorBubbleMenu] Fallback Selektions-Koordinaten:', selectionCoords);
            newCalculatedPosition = {
                top: selectionCoords.bottom + window.scrollY + 5,
                left: selectionCoords.left + window.scrollX
            };
        }
        console.log('[EditorBubbleMenu] Berechnete newPosition:', newCalculatedPosition);
        setPopoverPosition(newCalculatedPosition); // Position setzen, useEffect wird dann Popover anzeigen
      } else {
        console.log('[EditorBubbleMenu] Keine Quellen gefunden.');
        alert("Keine passenden Quellen gefunden.");
        // Stellen sicher, dass Popover geschlossen bleibt und keine alten Quellen angezeigt werden
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

  // useEffect, um das Popover anzuzeigen, NACHDEM die Position und Quellen gesetzt wurden
  useEffect(() => {
    if (popoverPosition && foundSources && foundSources.length > 0) {
      console.log('[EditorBubbleMenu] useEffect: popoverPosition UND foundSources sind gültig. Zeige Popover.', { popoverPosition, numSources: foundSources.length });
      setShowSourcePopover(true);
    } else if (!popoverPosition && showSourcePopover) {
      // Wenn Position entfernt wird (z.B. beim erneuten Klick), Popover auch schließen
      console.log('[EditorBubbleMenu] useEffect: popoverPosition ist null, schließe Popover.');
      setShowSourcePopover(false);
    }
  }, [popoverPosition, foundSources, showSourcePopover]); // Abhängigkeiten hier sorgfältig wählen

  // Funktion zur Auswahl einer Quelle
  const handleSelectSource = (source: SourceChunk) => {
    if (!editor) return;

    const author = source.document_author || 'Unbekannt';
    const year = source.publication_year || 'N/A';
    const page = source.page_number !== null ? `S. ${source.page_number + 1}` : '';

    let displayText = `${author}, ${year}`;
    if (page) {
      displayText += `, ${page}`;
    }
    displayText = `(${displayText}) `; // Wichtig: Leerzeichen am Ende für Trennung

    const commandChain = editor.chain().focus();

    if (selectedRangeForCitation) {
      // Gehe zum Ende der ursprünglichen Selektion
      commandChain.setTextSelection(selectedRangeForCitation.to);

      // Füge die Zitation HINTER der vorherigen Selektion ein
      // (und den Fokus direkt nach der eingefügten Zitation setzen)
      commandChain.insertCitation({ chunkId: source.chunk_id, displayText }).run();
    } else {
      // Fallback: an aktueller Cursorposition einfügen (bleibt gleich)
      commandChain.insertCitation({ chunkId: source.chunk_id, displayText }).run();
    }

    // Fokus nach dem Einfügen kann manchmal helfen, den Cursor korrekt zu positionieren
    // editor.commands.focus('end'); // Optional, je nach gewünschtem Verhalten

    setShowSourcePopover(false);
    setFoundSources([]);
    setSelectedRangeForCitation(null);
    setPopoverPosition(null);
  };

  // useEffect für Klick außerhalb des Popovers
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const popoverElement = document.querySelector('#source-selection-popover');
      // Wir brauchen auch eine Referenz zum BubbleMenu-Trigger-Button, um zu verhindern,
      // dass ein Klick darauf das gerade geöffnete Popover sofort wieder schließt.
      const triggerButton = (event.target as HTMLElement).closest('button[title="Passende Quelle suchen"]');

      if (triggerButton) return; // Klick war auf den Trigger, nichts tun

      if (showSourcePopover && popoverElement && !popoverElement.contains(event.target as Node)) {
        console.log('[EditorBubbleMenu] Klick außerhalb des Popovers, schließe es.');
        setShowSourcePopover(false);
        // Optional: Auch Position und Quellen zurücksetzen, wenn es durch Klick außerhalb geschlossen wird
        // setPopoverPosition(null);
        // setFoundSources([]);
      }
    };

    if (showSourcePopover) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSourcePopover]); // Nur von showSourcePopover abhängig

  const tippyOptions: BubbleMenuProps['tippyOptions'] = {
    duration: 100,
    placement: 'top-start',
    // hideOnClick: false, // Könnte helfen, das BubbleMenu offen zu halten, wenn das Popover aktiv ist.
                         // Aber Vorsicht mit Tippy's eigener Logik.
  };

  return (
    <>
      <BubbleMenu
        editor={editor}
        tippyOptions={tippyOptions}
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
            disabled={!editor || isAiLoading || editor.state.selection.empty}
            className={`p-2 h-9 w-9 flex items-center justify-center rounded text-purple-600
                        ${!editor || editor.state.selection.empty ? 'opacity-50 cursor-not-allowed' : 'hover:bg-purple-100'}
                        ${isAiLoading ? 'cursor-wait' : ''}`}
            title="Text umschreiben (KI)" type="button" >
            {isAiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Edit3 className="w-4 h-4" />}
        </button>
        <span className="border-l border-gray-300 mx-1 h-6 self-center"></span>
        {/* Button für Quellensuche */}
        <button
          onClick={handleFindSources}
          disabled={!editor || isSourceLoading || editor.state.selection.empty}
          className={`p-2 h-9 w-9 flex items-center justify-center rounded text-blue-600
                      ${!editor || editor.state.selection.empty ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-100'}
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
                zIndex: 1000 // Stelle sicher, dass es über anderen Elementen liegt
            }}
        >
            <SourceSelectionPopover
                sources={foundSources}
                onSelectSource={handleSelectSource}
                onClose={() => { // Ausführlichere onClose Logik
                    console.log('[EditorBubbleMenu] onClose von SourceSelectionPopover aufgerufen.');
                    setShowSourcePopover(false);
                    setPopoverPosition(null);
                    setFoundSources([]); // Quellen auch hier zurücksetzen
                }}
                // position Prop ist nicht mehr für Styling im Popover selbst nötig
            />
        </div>
      )}
    </>
  )
}

export default EditorBubbleMenu;