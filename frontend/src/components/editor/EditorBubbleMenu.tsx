// src/components/editor/EditorBubbleMenu.tsx
"use client";

import { BubbleMenu, Editor, BubbleMenuProps } from "@tiptap/react";
import React, { useState, useEffect, useCallback } from "react";
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Edit3,
  Loader2,
  BookMarked,
  Sparkles,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import {
  generateSimpleText,
  findSimilarSources,
  SourceChunk,
  generateTextFromQuery,
  GeneratedTextResponseFE,
} from "@/services/llmService";
import SourceSelectionPopover from "./SourceSelectionPopover";
import InlinePromptInput from './InlinePromptInput'; 

interface EditorBubbleMenuProps {
  editor: Editor | null;
}

export enum ActivePromptType {
  NONE,
  REWRITE,
  GENERATE
}

const EditorBubbleMenu: React.FC<EditorBubbleMenuProps> = ({ editor }) => {
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isSourceLoading, setIsSourceLoading] = useState(false);
  const [isGeneratingText, setIsGeneratingText] = useState(false); // Wird jetzt für beide KI-Text-Funktionen genutzt

  const [foundSources, setFoundSources] = useState<SourceChunk[]>([]);
  const [showSourcePopover, setShowSourcePopover] = useState(false);
  const [popoverPosition, setPopoverPosition] = useState<{ top: number; left: number } | null>(null);
  const [selectedRangeForCitation, setSelectedRangeForCitation] = useState<{from: number, to: number} | null>(null);

  // Für Inline Prompts
  const [activePrompt, setActivePrompt] = useState<ActivePromptType>(ActivePromptType.NONE);
  const [currentInlinePrompt, setCurrentInlinePrompt] = useState("");
  const [rangeForInsertion, setRangeForInsertion] = useState<{from: number, to: number} | null>(null);

const toggleInlinePrompt = (type: ActivePromptType) => { // Stelle sicher, dass diese Funktion existiert
    if (!editor) return;
    // Schließe andere Popups/Prompts, bevor ein neuer geöffnet wird
    if (activePrompt !== ActivePromptType.NONE && activePrompt !== type) {
        closeAllPopups(); // Stellt sicher, dass SourcePopover etc. zu ist
    }

    if (activePrompt === type) {
      setActivePrompt(ActivePromptType.NONE);
      setCurrentInlinePrompt("");
    } else {
      const { selection } = editor.state;
      if (type === ActivePromptType.REWRITE) {
        if (selection.empty) {
          alert("Bitte zuerst Text markieren zum Umschreiben.");
          setActivePrompt(ActivePromptType.NONE); // Verhindere Öffnen, wenn keine Selektion
          return;
        }
        const selectedText = editor.state.doc.textBetween(selection.from, selection.to, " ").trim();
        setCurrentInlinePrompt(`Umschreibung für: "${selectedText.substring(0, 30)}..." (optional verbessern)`);
        // rangeForInsertion wird für Umschreiben nicht direkt hier gesetzt, handleRewriteText nutzt editor.state.selection
      } else if (type === ActivePromptType.GENERATE) {
        setCurrentInlinePrompt("");
        setRangeForInsertion({ from: selection.to, to: selection.to }); // Einfügepunkt am Ende der aktuellen Selektion/Cursor
      }
      setActivePrompt(type);
    }
  };

  // Funktion zur Steuerung der Sichtbarkeit des BubbleMenu
  const shouldShowBubbleMenu = useCallback(
    ({ editor: currentEditor, view, state, from, to }: any): boolean => {
      if (!currentEditor) return false; // Sicherstellen, dass der Editor existiert
      const { selection } = currentEditor.state;
      const { empty } = selection;
      const isFocus = view.hasFocus();

      // Zeige Menü, wenn Text ausgewählt ist ODER ein Inline-Prompt aktiv ist und der Editor Fokus hat
      return isFocus && (!empty || activePrompt !== ActivePromptType.NONE);
    },
    [activePrompt] // Abhängigkeit vom activePrompt State
  );

  if (!editor) {
    return null
  }

  const closeAllPopups = () => {
    setShowSourcePopover(false);
    setActivePrompt(ActivePromptType.NONE);
  }

  // TEXT UMSCHREIBEN (handleRewriteText)
  const handleRewriteText = async (optionalPrompt?: string) => {
    if (!editor || editor.state.selection.empty) {
      if (activePrompt === ActivePromptType.REWRITE) setActivePrompt(ActivePromptType.NONE); // Schließe Prompt-Feld, wenn keine Selektion
      alert("Bitte markiere zuerst Text, der umgeschrieben werden soll.");
      return;
    }

    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to, " ");
    if (!selectedText.trim()) {
      alert("Kein Text markiert zum Umschreiben.");
      return;
    }

    closeAllPopups(); // Schließe andere Popups
    setIsGeneratingText(true); // Nutze generischen Ladezustand

    let prompt = `Schreibe den folgenden Text prägnanter und klarer um. Gib nur den umgeschriebenen Text zurück, ohne zusätzliche Kommentare, Einleitungen oder Formatierungen wie Markdown:\n\nOriginaltext:\n"${selectedText.trim()}"\n\nUmschreibung:`;
    if (optionalPrompt && optionalPrompt.trim()) {
      prompt = `${optionalPrompt.trim()}:\n\nOriginaltext:\n"${selectedText.trim()}"\n\nUmschreibung:`;
    }

    try {
      const rewrittenText = await generateSimpleText(prompt); // generateSimpleText für Umschreiben
      if (rewrittenText && !rewrittenText.toLowerCase().startsWith("fehler:")) {
        editor.chain().focus().setTextSelection({ from, to }).deleteSelection().insertContent(rewrittenText.trim()).run();
      } else {
        alert(rewrittenText || "Keine Antwort von der KI erhalten.");
      }
    } catch (e: any) {
      console.error("Fehler beim Umschreiben:", e);
      alert(`Fehler beim Umschreiben: ${e?.message || 'Unbekannt'}`);
    } finally {
      setIsGeneratingText(false);
      setActivePrompt(ActivePromptType.NONE);
    }
  };

  // Funktion für die Quellensuche
  const handleFindSources = async () => {
    if (!editor || editor.state.selection.empty) {
      alert(
        "Bitte markiere zuerst Text, für den Quellen gesucht werden sollen."
      );
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
    setPopoverPosition(null); // Position zurücksetzen

    try {
      const sources = await findSimilarSources(trimmedSelectedText, 5);
      console.log("[EditorBubbleMenu] Gefundene Quellen:", sources);
      setFoundSources(sources); // Wichtig: Quellen setzen, auch wenn Popover noch nicht sichtbar

      if (sources && sources.length > 0) {
        setSelectedRangeForCitation({ from, to });

        // WICHTIG: Überprüfe diese Klasse im Inspektor!
        // Mögliche Kandidaten: '.tippy-popper', '.tippy-content', oder eine spezifischere von Tiptap/Tippy.
        const bubbleMenuPopperElement =
          editor.view.dom.closest(".tippy-popper");
        console.log(
          "[EditorBubbleMenu] bubbleMenuPopperElement (suche nach .tippy-popper):",
          bubbleMenuPopperElement
        );

        let newCalculatedPosition: { top: number; left: number } | null = null;

        if (bubbleMenuPopperElement) {
          const rect = bubbleMenuPopperElement.getBoundingClientRect();
          console.log("[EditorBubbleMenu] bubbleMenuPopperElement rect:", rect);
          newCalculatedPosition = {
            top: rect.bottom + window.scrollY + 5, // 5px unter dem Popper
            left: rect.left + window.scrollX, // Bündig mit linker Kante des Poppers
          };
        } else {
          console.warn(
            "[EditorBubbleMenu] Popper-Element des BubbleMenu nicht gefunden, verwende Fallback-Positionierung relativ zur Selektion."
          );
          const selectionCoords = editor.view.coordsAtPos(from);
          console.log(
            "[EditorBubbleMenu] Fallback Selektions-Koordinaten:",
            selectionCoords
          );
          newCalculatedPosition = {
            top: selectionCoords.bottom + window.scrollY + 5,
            left: selectionCoords.left + window.scrollX,
          };
        }
        console.log(
          "[EditorBubbleMenu] Berechnete newPosition:",
          newCalculatedPosition
        );
        setPopoverPosition(newCalculatedPosition); // Position setzen, useEffect wird dann Popover anzeigen
      } else {
        console.log("[EditorBubbleMenu] Keine Quellen gefunden.");
        alert("Keine passenden Quellen gefunden.");
        // Stellen sicher, dass Popover geschlossen bleibt und keine alten Quellen angezeigt werden
        setFoundSources([]);
        setShowSourcePopover(false);
        setPopoverPosition(null);
      }
    } catch (e: any) {
      console.error("Fehler bei der Quellensuche im BubbleMenu:", e);
      alert(`Fehler bei der Quellensuche: ${e?.message || "Unbekannt"}`);
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
      console.log(
        "[EditorBubbleMenu] useEffect: popoverPosition UND foundSources sind gültig. Zeige Popover.",
        { popoverPosition, numSources: foundSources.length }
      );
      setShowSourcePopover(true);
    } else if (!popoverPosition && showSourcePopover) {
      // Wenn Position entfernt wird (z.B. beim erneuten Klick), Popover auch schließen
      console.log(
        "[EditorBubbleMenu] useEffect: popoverPosition ist null, schließe Popover."
      );
      setShowSourcePopover(false);
    }
  }, [popoverPosition, foundSources, showSourcePopover]); // Abhängigkeiten hier sorgfältig wählen

  // Funktion zur Auswahl einer Quelle
  const handleSelectSource = (source: SourceChunk) => { // 'source' ist vom Typ SourceChunk
    if (!editor) return;

    // 1. Erstelle das Attribute-Objekt mit allen Roh-Metadaten
    const citationNodeAttributes = {
        chunkId: source.chunk_id,
        author: source.document_author,    // Direkt aus SourceChunk übernehmen
        year: source.publication_year,     // Direkt aus SourceChunk übernehmen (kann null sein)
        page: source.page_number,          // Direkt aus SourceChunk übernehmen (kann null sein, ist 0-basiert)
        title: source.document_title,    // Direkt aus SourceChunk übernehmen
        // displayText als initialer Fallback oder für No-JS.
        // CitationView wird ihn mit dem Formatter überschreiben.
        displayText: `(${(source.document_author || 'Unbekannt')}, ${source.publication_year || 'N.D.'}${source.page_number !== null ? `, S. ${source.page_number + 1}` : ''}) `
    };
    console.log("[handleSelectSource] Erstellte citationNodeAttributes:", citationNodeAttributes);


    const commandChain = editor.chain().focus();

    if (selectedRangeForCitation) {
        commandChain.setTextSelection(selectedRangeForCitation.to);
        // 2. Übergib das vollständige Attribute-Objekt
        commandChain.insertCitation(citationNodeAttributes).run();
    } else {
        // 2. Übergib das vollständige Attribute-Objekt
        commandChain.insertCitation(citationNodeAttributes).run();
    }

    setShowSourcePopover(false);
    setFoundSources([]);
    setSelectedRangeForCitation(null);
    setPopoverPosition(null);
};

  
// Funktion zum Umschalten des Inline-Prompts
const handleGenerateText = async (userPrompt?: string) => {
  if (!editor) {
    console.error("[handleGenerateText] Editor nicht initialisiert.");
    return;
  }

  closeAllPopups(); // Stellt sicher, dass andere Popups geschlossen sind
  setIsGeneratingText(true);

  const NUM_SOURCES_FOR_GENERATION = 3; // Fester Wert
  const entireEditorContentForAPI = editor.getHTML(); // Gesamter Editor-Inhalt

  // 'effectiveQueryForAPI' wird an das Backend als 'user_prompt' gesendet.
  // Der 'entireEditorContentForAPI' wird als 'editor_context_html' gesendet.
  const effectiveQueryForAPI = userPrompt?.trim() || "Schreibe einen passenden wissenschaftlichen Textabschnitt, der den vorherigen Inhalt fortführt oder ergänzt, basierend auf den relevanten Quellen.";

  try {
    // ANNAHME: generateTextFromQuery wurde angepasst, um editorContextHtml und optionalen userPrompt zu akzeptieren
    const response: GeneratedTextResponseFE = await generateTextFromQuery(
      entireEditorContentForAPI, // Erster Parameter: Hauptkontext
      effectiveQueryForAPI,      // Zweiter Parameter: Spezifischer User-Prompt/Anweisung
      NUM_SOURCES_FOR_GENERATION
    );

    if (response.generated_text) {
      const sourceMap = new Map(response.sources.map(s => [s.chunk_id, s]));
      const contentToInsert: Array<any> = [];
      const citationRegex = /\[ID:([a-f0-9-]+(?:-[a-f0-9]+)*)\]/gi;
      let lastIndex = 0;
      let match;
      let matchCount = 0;

      while ((match = citationRegex.exec(response.generated_text)) !== null) {
        matchCount++; 
        const plainTextBefore = response.generated_text.substring(lastIndex, match.index);
        if (plainTextBefore) {
          contentToInsert.push(plainTextBefore);
        }

        const chunkId = match[1];
        const sourceData = sourceMap.get(chunkId);

        if (sourceData) {
          const citationAttributes = {
            chunkId: sourceData.chunk_id,
            author: sourceData.author,
            year: sourceData.year,
            page: sourceData.page,
            title: sourceData.title,
            displayText: `(${(sourceData.author || 'Autor unbekannt')}, ${sourceData.year || 'N.D.'}${sourceData.page !== null ? `, S. ${sourceData.page! + 1}` : ''})`
          };

          if (editor.schema.nodes.citation) {
            const citationNodeInstance = editor.schema.nodes.citation.create(citationAttributes);
            if (citationNodeInstance) {
              contentToInsert.push(citationNodeInstance.toJSON());
            } else {
              contentToInsert.push(match[0]); // Fallback: Rohes Tag
            }
          } else {
            contentToInsert.push(match[0]); // Fallback: Rohes Tag
          }
        } else {
          contentToInsert.push(match[0]); // Fallback: Rohes Tag
        }
        lastIndex = citationRegex.lastIndex;
      }

      const plainTextAfter = response.generated_text.substring(lastIndex);
      if (plainTextAfter) {
        contentToInsert.push(plainTextAfter);
      }

      if (contentToInsert.length > 0) {
        let commandChain = editor.chain().focus();
        const insertPos = rangeForInsertion ? rangeForInsertion.to : editor.state.selection.to;
        commandChain = commandChain.setTextSelection(insertPos);

        for (const item of contentToInsert) {
          commandChain = commandChain.insertContent(item);
        }
        commandChain.run();
      }
    } else {
      alert("Kein Text von der KI generiert.");
    }
  } catch (error: any) {
    console.error("[handleGenerateText] Fehler:", error);
    alert(`Fehler bei der Textgenerierung: ${error.message || 'Unbekannt'}`);
  } finally {
    setIsGeneratingText(false);
    setActivePrompt(ActivePromptType.NONE); // Schließe Inline-Prompt nach Aktion
    setRangeForInsertion(null);
  }
};

  // useEffect für Klick außerhalb des Popovers
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const popoverElement = document.querySelector(
        "#source-selection-popover"
      );
      // Wir brauchen auch eine Referenz zum BubbleMenu-Trigger-Button, um zu verhindern,
      // dass ein Klick darauf das gerade geöffnete Popover sofort wieder schließt.
      const triggerButton = (event.target as HTMLElement).closest(
        'button[title="Passende Quelle suchen"]'
      );

      if (triggerButton) return; // Klick war auf den Trigger, nichts tun

      if (
        showSourcePopover &&
        popoverElement &&
        !popoverElement.contains(event.target as Node)
      ) {
        console.log(
          "[EditorBubbleMenu] Klick außerhalb des Popovers, schließe es."
        );
        setShowSourcePopover(false);
        // Optional: Auch Position und Quellen zurücksetzen, wenn es durch Klick außerhalb geschlossen wird
        // setPopoverPosition(null);
        // setFoundSources([]);
      }
    };

    if (showSourcePopover) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showSourcePopover]); // Nur von showSourcePopover abhängig

  const tippyOptions: BubbleMenuProps["tippyOptions"] = {
    duration: 100,
    placement: "top-start",
    // hideOnClick: false, // Könnte helfen, das BubbleMenu offen zu halten, wenn das Popover aktiv ist.
    // Aber Vorsicht mit Tippy's eigener Logik.
  };

    return (
    <>
      <BubbleMenu
        editor={editor}
        tippyOptions={tippyOptions} // Stelle sicher, dass tippyOptions korrekt definiert ist
        shouldShow={shouldShowBubbleMenu} // Stelle sicher, dass shouldShowBubbleMenu korrekt definiert ist
        className="flex flex-col bg-white rounded-lg shadow-xl border border-gray-200 p-1 z-20" // z-index erhöht
      >
        <div className="flex space-x-0.5"> {/* Reihe für die Haupt-Aktionsbuttons */}
          {/* Fett */}
          <button
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`p-2 h-9 w-9 flex items-center justify-center rounded ${
              editor.isActive("bold")
                ? "bg-slate-700 text-white"
                : "hover:bg-slate-100 text-slate-700"
            }`}
            title="Fett" type="button" >
            <Bold className="w-4 h-4" />
          </button>
          {/* Kursiv */}
          <button
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`p-2 h-9 w-9 flex items-center justify-center rounded ${
              editor.isActive("italic")
                ? "bg-slate-700 text-white"
                : "hover:bg-slate-100 text-slate-700"
            }`}
            title="Kursiv" type="button" >
            <Italic className="w-4 h-4" />
          </button>
          {/* Durchgestrichen */}
          <button
            onClick={() => editor.chain().focus().toggleStrike().run()}
            className={`p-2 h-9 w-9 flex items-center justify-center rounded ${
              editor.isActive("strike")
                ? "bg-slate-700 text-white"
                : "hover:bg-slate-100 text-slate-700"
            }`}
            title="Durchgestrichen" type="button" >
            <Strikethrough className="w-4 h-4" />
          </button>
          <span className="border-l border-gray-300 mx-1 h-6 self-center"></span>
          {/* Code */}
          <button
            onClick={() => editor.chain().focus().toggleCode().run()}
            className={`p-2 h-9 w-9 flex items-center justify-center rounded ${
              editor.isActive("code")
                ? "bg-slate-700 text-white"
                : "hover:bg-slate-100 text-slate-700"
            }`}
            title="Code" type="button" >
            <Code className="w-4 h-4" />
          </button>
          <span className="border-l border-gray-300 mx-1 h-6 self-center"></span>

          {/* KI Umschreiben Button (Schnellaktion) */}
          <button
            onClick={() => handleRewriteText()} // Ruft handleRewriteText ohne optionalen Prompt auf
            disabled={!editor || isGeneratingText || editor.state.selection.empty}
            className={`p-2 h-9 w-9 flex items-center justify-center rounded text-purple-600 ${
              (!editor || editor.state.selection.empty) ? "opacity-50 cursor-not-allowed" : "hover:bg-purple-100"
            } ${isGeneratingText ? "cursor-wait" : ""}`}
            title="Text umschreiben (Schnell)" type="button" >
            <Edit3 className="w-4 h-4" />
          </button>
          {/* Button zum Ein-/Ausklappen des Umschreiben-Prompts */}
          <button
            onClick={() => toggleInlinePrompt(ActivePromptType.REWRITE)}
            disabled={!editor || editor.state.selection.empty}
            className={`p-1 h-9 w-5 flex items-center justify-center rounded ${
              activePrompt === ActivePromptType.REWRITE ? 'bg-purple-200 text-purple-700' : 'text-purple-600 hover:bg-purple-100'
            } ${(!editor || editor.state.selection.empty) ? 'opacity-50 cursor-not-allowed' : ''}`}
            title="Umschreiben mit Anweisung" >
            {activePrompt === ActivePromptType.REWRITE ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
          </button>

          <span className="border-l border-gray-300 mx-1 h-6 self-center"></span>
          {/* Button für Quellensuche */}
          <button
            onClick={handleFindSources}
            disabled={!editor || isSourceLoading || editor.state.selection.empty}
            className={`p-2 h-9 w-9 flex items-center justify-center rounded text-blue-600 ${
              (!editor || editor.state.selection.empty) ? "opacity-50 cursor-not-allowed" : "hover:bg-blue-100"
            } ${isSourceLoading ? "cursor-wait" : ""}`}
            title="Passende Quelle suchen" type="button" >
            {isSourceLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <BookMarked className="w-4 h-4" />}
          </button>
          <span className="border-l border-gray-300 mx-1 h-6 self-center"></span>

          {/* Text generieren Button (Schnellaktion ohne spezifischen Prompt) */}
          <button
            onClick={() => handleGenerateText()} // Ruft handleGenerateText ohne optionalen User-Prompt auf
            disabled={!editor || isGeneratingText}
            className={`p-2 h-9 w-9 flex items-center justify-center rounded text-green-600 ${
              !editor ? "opacity-50 cursor-not-allowed" : "hover:bg-green-100"
            } ${isGeneratingText ? "cursor-wait" : ""}`}
            title="Text weiterführen (KI)" type="button" >
            <Sparkles className="w-4 h-4" />
          </button>
          {/* Button zum Ein-/Ausklappen des Generieren-Prompts */}
           <button
            onClick={() => toggleInlinePrompt(ActivePromptType.GENERATE)}
            disabled={!editor}
            className={`p-1 h-9 w-5 flex items-center justify-center rounded ${
              activePrompt === ActivePromptType.GENERATE ? 'bg-green-200 text-green-700' : 'text-green-600 hover:bg-green-100'
            }`}
            title="Generieren mit Anweisung" >
            {activePrompt === ActivePromptType.GENERATE ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
          </button>
        </div>

        {/* Container für die Inline-Prompt-Felder */}
        <div className="inline-prompt-container w-full"> {/* Stellt sicher, dass der Container die Breite nimmt */}
            <InlinePromptInput
              isVisible={activePrompt === ActivePromptType.REWRITE}
              initialValue={currentInlinePrompt} // currentInlinePrompt muss im State sein
              onSubmit={(prompt) => handleRewriteText(prompt)} // Ruft handleRewriteText mit dem Prompt auf
              onClose={() => setActivePrompt(ActivePromptType.NONE)}
              placeholder="Anweisung für Umschreibung (optional)"
              isLoading={isGeneratingText} // isGeneratingText muss im State sein
            />
            <InlinePromptInput
              isVisible={activePrompt === ActivePromptType.GENERATE}
              initialValue={currentInlinePrompt} // currentInlinePrompt muss im State sein
              onSubmit={(prompt) => handleGenerateText(prompt)} // Ruft handleGenerateText mit dem Prompt auf
              onClose={() => setActivePrompt(ActivePromptType.NONE)}
              placeholder="Thema/Anweisung für neuen Text (optional)"
              isLoading={isGeneratingText} // isGeneratingText muss im State sein
            />
        </div>
      </BubbleMenu>

      {/* Popover für Quellenauswahl (bleibt wie es war) */}
      {showSourcePopover &&
        editor &&
        popoverPosition &&
        foundSources &&
        foundSources.length > 0 && (
          <div
            id="source-selection-popover"
            style={{
              position: "absolute",
              top: `${popoverPosition.top}px`,
              left: `${popoverPosition.left}px`,
              zIndex: 1000, // Ggf. anpassen, falls es vom BubbleMenu verdeckt wird
            }}
          >
            <SourceSelectionPopover
              sources={foundSources}
              onSelectSource={handleSelectSource} // handleSelectSource muss definiert sein
              onClose={() => {
                setShowSourcePopover(false);
                setPopoverPosition(null);
                setFoundSources([]);
              }}
            />
          </div>
        )}
      {/* GenerateTextPromptModal wird nicht mehr verwendet und kann entfernt werden */}
    </>
  );
}
export default EditorBubbleMenu;
