// src/components/editor/Tiptap.tsx
'use client'

import { useEditor, EditorContent, Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import React, { useState, useCallback } from 'react' // useEffect, useRef nicht mehr zwingend hier benötigt
import EditorBubbleMenu from './EditorBubbleMenu'
// ActivePromptType wird hier nicht mehr direkt benötigt, wenn die Logik in den Menüs selbst liegt
// import { ActivePromptType } from './EditorBubbleMenu'
import EditorToolbar from './EditorToolbar'
import Citation from './extensions/CitationNode'
import EditorContextMenu from './EditorContextMenu';
import {
  generateTextFromQuery,
  // GeneratedTextResponseFE, // Wird nur im Handler verwendet
  // ... andere Service-Funktionen, die du hier brauchst
} from "@/services/llmService";

interface MenuPosition {
  x: number;
  y: number;
}

const Tiptap: React.FC = () => {
  const [contextMenuState, setContextMenuState] = useState<{
    isVisible: boolean;
    position: MenuPosition | null;
  }>({ isVisible: false, position: null });

  const [isGeneratingTextFromContext, setIsGeneratingTextFromContext] = useState(false); // Für den Ladezustand

  const editor = useEditor({
    extensions: [
      StarterKit,
      Citation,
    ],
    editorProps: {
      handleDOMEvents: {
        contextmenu: (view, event) => {
          event.preventDefault();
          const { state } = view;
          if (!state.selection.empty && contextMenuState.isVisible) {
            setContextMenuState({ isVisible: false, position: null });
            return false;
          }
          if (state.selection.empty || !contextMenuState.isVisible) {
            setContextMenuState({
              isVisible: true,
              position: { x: event.clientX, y: event.clientY },
            });
          }
          return true;
        },
        mousedown: (view, event) => {
          if (event.button === 0 && contextMenuState.isVisible && !(event.target as HTMLElement).closest('.editor-context-menu-class')) {
            setContextMenuState({ isVisible: false, position: null });
          }
          return false;
        },
      },
    },
    content: `
      <h2>PaperPilot Text Editor</h2>
      <p>
        Willkommen zu Ihrem Text-Editor! Wählen Sie etwas Text aus, um das Formatierungsmenü anzuzeigen.
      </p>
      <p>
        Rechtsklicken Sie in den Editor, um das Menü für Aktionen wie "Text generieren" zu öffnen.
      </p>
    `,
  });

  const closeContextMenu = useCallback(() => {
    setContextMenuState({ isVisible: false, position: null });
  }, []);

  const handleContextMenuGenerateText = async (userPromptFromContextMenu?: string) => {
    if (!editor) return;
    closeContextMenu();
    setIsGeneratingTextFromContext(true);
    const NUM_SOURCES = 3;
    const editorHTML = editor.getHTML();
    const effectivePrompt = userPromptFromContextMenu?.trim() || "Schreibe einen passenden wissenschaftlichen Textabschnitt...";
    try {
      const response = await generateTextFromQuery(editorHTML, effectivePrompt, NUM_SOURCES);
      if (response.generated_text) {
        const sourceMap = new Map(response.sources.map(s => [s.chunk_id, s]));
        const contentToInsert: Array<any> = [];
        const citationRegex = /\[ID:([a-f0-9-]+(?:-[a-f0-9]+)*)\]/gi;
        let lastIndex = 0; let match;
        while ((match = citationRegex.exec(response.generated_text)) !== null) {
          const textBefore = response.generated_text.substring(lastIndex, match.index);
          if (textBefore) contentToInsert.push(textBefore);
          const chunkId = match[1]; const sourceData = sourceMap.get(chunkId);
          if (sourceData && editor.schema.nodes.citation) {
            const attrs = { chunkId, author: sourceData.author, year: sourceData.year, page: sourceData.page, title: sourceData.title, displayText: `(${sourceData.author||'A'}, ${sourceData.year||'Y'})`};
            const node = editor.schema.nodes.citation.create(attrs);
            if(node) contentToInsert.push(node.toJSON()); else contentToInsert.push(match[0]);
          } else contentToInsert.push(match[0]);
          lastIndex = citationRegex.lastIndex;
        }
        const textAfter = response.generated_text.substring(lastIndex);
        if (textAfter) contentToInsert.push(textAfter);
        if (contentToInsert.length > 0) {
          const currentPos = editor.state.selection.to;
          let chain = editor.chain().focus().setTextSelection(currentPos);
          for (const item of contentToInsert) { chain = chain.insertContent(item); }
          chain.run();
        }
      } else { alert("Kein Text von der KI generiert (Kontextmenü)."); }
    } catch (e: any) { alert(`Fehler bei Textgenerierung (Kontextmenü): ${e?.message || 'Unbekannt'}`); }
    finally { setIsGeneratingTextFromContext(false); }
  };

  // Platzhalter-Handler für RewriteText aus dem Kontextmenü
  const handleContextMenuRewriteText = (prompt?: string) => {
    if (!editor) return;
    closeContextMenu();
    if (editor.state.selection.empty && !prompt) {
        alert("Bitte Text für 'Umschreiben' markieren oder eine Anweisung im Kontextmenü-Prompt geben.");
        return;
    }
    // Hier würde die Logik für das Umschreiben stehen, die generateSimpleText aufruft.
    // Du kannst die Logik aus handleRewrite in EditorContextMenu.tsx hierher kopieren oder
    // (besser) eine gemeinsame Service-Funktion erstellen.
    alert(`Aktion 'Umschreiben' aus Kontextmenü getriggert. Prompt: ${prompt || '(kein Prompt)'}. Markierter Text: ${editor.state.selection.empty ? 'Nichts' : 'Ja'}`);
    // Beispiel: handleAction(() => actualRewriteLogic(editor, prompt))
  };

  // Platzhalter-Handler für FindSources aus dem Kontextmenü
  const handleContextMenuFindSources = () => {
    if (!editor) return;
    closeContextMenu();
    if (editor.state.selection.empty) {
        alert("Bitte Text für 'Quellen suchen' markieren.");
        return;
    }
    // Hier würde die Logik für die Quellensuche stehen (API-Call, Popover anzeigen).
    // Da das SourceSelectionPopover vom EditorBubbleMenu gesteuert wird, ist dies komplexer.
    alert("Aktion 'Quellen suchen' aus Kontextmenü getriggert. (Logik zum Öffnen des Popovers fehlt noch)");
  };


  if (!editor) {
    return null;
  }

  return (
    <div className="w-full h-full flex flex-col relative">
      <EditorToolbar editor={editor} />
      <EditorBubbleMenu editor={editor} />
      <EditorContent
        editor={editor}
        className="flex-grow border border-gray-300 rounded-md p-4 overflow-y-auto prose prose-sm max-w-none focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
      />
      {contextMenuState.isVisible && contextMenuState.position && editor && (
        <EditorContextMenu
          editor={editor}
          position={{ top: contextMenuState.position.y, left: contextMenuState.position.x }}
          isVisible={contextMenuState.isVisible}
          onClose={closeContextMenu}
          onGenerateText={handleContextMenuGenerateText}
          onRewriteText={handleContextMenuRewriteText} // Fehlende Prop hinzugefügt
          onFindSources={handleContextMenuFindSources}   // Fehlende Prop hinzugefügt
        />
      )}
    </div>
  );
};

export default Tiptap;