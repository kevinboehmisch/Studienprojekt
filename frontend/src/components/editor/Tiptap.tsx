// src/components/editor/Tiptap.tsx
'use client'

import { useEditor, EditorContent, Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import React, { useState, useCallback, useEffect, useRef } from 'react'
import EditorBubbleMenu from './EditorBubbleMenu'
import EditorToolbar from './EditorToolbar'
import Citation from './extensions/CitationNode'
import EditorContextMenu from './EditorContextMenu';
import { generateTextFromQuery } from "@/services/llmService";
import Heading from '@tiptap/extension-heading';

import {
  OutlineItem,
  NumberedOutlineItem,
  generateNumberedDisplayOutline,
} from '../../utils/outlineUtils';

interface MenuPosition {
  x: number;
  y: number;
}

interface TiptapProps {
  onOutlineUpdate?: (outline: OutlineItem[]) => void;
  initialOutline?: OutlineItem[];
}

const CustomHeading = Heading.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      'data-outline-id': {
        default: null,
        parseHTML: element => element.getAttribute('data-outline-id'),
        renderHTML: attributes => {
          if (!attributes['data-outline-id']) {
            return {};
          }
          return { 'data-outline-id': attributes['data-outline-id'] };
        },
        keepOnSplit: false,
      },
      'data-outline-level': {
        default: null,
        parseHTML: element => {
          const level = element.getAttribute('data-outline-level');
          return level ? parseInt(level, 10) : null;
        },
        renderHTML: attributes => {
          if (attributes['data-outline-level'] === null || attributes['data-outline-level'] === undefined) {
            return {};
          }
          return { 'data-outline-level': attributes['data-outline-level'] };
        },
        keepOnSplit: false,
      },
    };
  },
});

const Tiptap: React.FC<TiptapProps> = ({ onOutlineUpdate, initialOutline }) => {
  const [contextMenuState, setContextMenuState] = useState<{
    isVisible: boolean;
    position: MenuPosition | null;
  }>({ isVisible: false, position: null });

  const [isGeneratingTextFromContext, setIsGeneratingTextFromContext] = useState(false);
  const lastOutlineRef = useRef<string>(JSON.stringify(initialOutline || []));
  const isInitialLoad = useRef(true);

  // Funktion zum intelligenten Aktualisieren der Gliederung ohne Textverlust
  const updateEditorWithNewOutline = useCallback((newOutlineItems: OutlineItem[], editorInstance: Editor) => {
    if (!editorInstance) return;

    // Aktuelle Überschriften und Inhalte aus dem Editor extrahieren
    const currentContent = new Map<string, string>();
    const currentDoc = editorInstance.state.doc;
    
    let currentHeadingId: string | null = null;
    let contentAfterHeading: string[] = [];

    currentDoc.forEach(node => {
      if (node.type.name === CustomHeading.name) {
        // Speichere den Inhalt der vorherigen Überschrift
        if (currentHeadingId && contentAfterHeading.length > 0) {
          currentContent.set(currentHeadingId, contentAfterHeading.join('\n').trim());
        }
        
        // Beginne mit der neuen Überschrift
        currentHeadingId = node.attrs['data-outline-id'] as string | null;
        contentAfterHeading = [];
      } else if (node.type.name === 'paragraph' && currentHeadingId) {
        // Sammle Absätze nach der aktuellen Überschrift
        const text = node.textContent?.trim();
        if (text) {
          contentAfterHeading.push(text);
        }
      }
    });

    // Speichere den Inhalt der letzten Überschrift
    if (currentHeadingId && contentAfterHeading.length > 0) {
      currentContent.set(currentHeadingId, contentAfterHeading.join('\n').trim());
    }

    // Neuen HTML-Inhalt mit erhaltenen Texten generieren
    let html = '<h1>PaperPilot Text Editor</h1>\n';
    const numberedOutline = generateNumberedDisplayOutline(newOutlineItems);

    const processItems = (items: NumberedOutlineItem[]) => {
      items.forEach(item => {
        const editorHeadingLevel = item.level + 1;
        const safeEditorHeadingLevel = Math.min(editorHeadingLevel, 4);

        html += `<h${safeEditorHeadingLevel} 
                    data-outline-id="${item.id}" 
                    data-outline-level="${item.level}"
                 >${item.numberedTitle}</h${safeEditorHeadingLevel}>\n`;
        
        // Vorhandenen Inhalt wiederherstellen oder leeren Absatz einfügen
        const existingContent = currentContent.get(item.id);
        if (existingContent) {
          // Teile den Inhalt in Absätze auf und füge sie ein
          const paragraphs = existingContent.split('\n').filter(p => p.trim());
          paragraphs.forEach(paragraph => {
            html += `<p>${paragraph}</p>\n`;
          });
        } else {
          html += "<p></p>\n";
        }
        
        if (item.children && item.children.length > 0) {
          processItems(item.children as NumberedOutlineItem[]);
        }
      });
    };
    
    processItems(numberedOutline);
    
    // Editor-Inhalt aktualisieren
    editorInstance.commands.setContent(html, false); // false -> kein 'update'-Event auslösen
    
  }, []); // Keine Abhängigkeiten, da wir editorInstance als Parameter übergeben

  // Funktion zum Konvertieren der Gliederung in HTML für den ersten Load
  const convertOutlineToHTML = useCallback((outlineItems: OutlineItem[]): string => {
    let html = '<h1>PaperPilot Text Editor</h1>\n';
    
    const numberedOutline = generateNumberedDisplayOutline(outlineItems);

    const processItems = (items: NumberedOutlineItem[]) => {
      items.forEach(item => {
        const editorHeadingLevel = item.level + 1;
        const safeEditorHeadingLevel = Math.min(editorHeadingLevel, 4);

        html += `<h${safeEditorHeadingLevel} 
                    data-outline-id="${item.id}" 
                    data-outline-level="${item.level}"
                 >${item.numberedTitle}</h${safeEditorHeadingLevel}>\n`;
        html += "<p></p>\n"; 
        
        if (item.children && item.children.length > 0) {
          processItems(item.children as NumberedOutlineItem[]);
        }
      });
    };
    
    processItems(numberedOutline);
    return html;
  }, []);

  const getInitialContent = useCallback((): string => {
    if (initialOutline && initialOutline.length > 0) {
      console.log("Tiptap: Initializing with initialOutline from props:", initialOutline);
      return convertOutlineToHTML(initialOutline);
    }
    
    if (typeof window !== 'undefined') {
      const savedConfig = localStorage.getItem('documentConfig');
      if (savedConfig) {
        try {
          const config = JSON.parse(savedConfig);
          if (config.outline && config.outline.length > 0) {
            console.log("Tiptap: Initializing with outline from localStorage:", config.outline);
            return convertOutlineToHTML(config.outline);
          }
        } catch (e) {
          console.error('Tiptap: Fehler beim Laden der Gliederung aus localStorage:', e);
        }
      }
    }
    
    console.log("Tiptap: Initializing with default content.");
    return `
      <h1>PaperPilot Text Editor</h1>
      <p>
        Willkommen zu Ihrem Text-Editor! Wählen Sie etwas Text aus, um das Formatierungsmenü anzuzeigen.
      </p>
      <p>
        Rechtsklicken Sie in den Editor, um das Menü für Aktionen wie "Text generieren" zu öffnen.
      </p>
    `;
  }, [initialOutline, convertOutlineToHTML]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
      }),
      CustomHeading.configure({ levels: [1, 2, 3, 4] }),
      Citation,
    ],
    immediatelyRender: false,
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
    content: getInitialContent(),
    onUpdate: ({ editor }) => {
      if (onOutlineUpdate) {
        const headings = extractHeadingsFromEditor(editor);
        const headingsString = JSON.stringify(headings);
        
        if (headingsString !== lastOutlineRef.current) {
          console.log("Tiptap: Outline changed in editor. Calling onOutlineUpdate.", headings);
          lastOutlineRef.current = headingsString;
          onOutlineUpdate(headings);
        }
      }
    },
  });

  // Effekt für Änderungen von außen (z.B. neue Kapitel)
  useEffect(() => {
    if (editor && initialOutline) {
      const newInitialOutlineString = JSON.stringify(initialOutline);
      
      if (newInitialOutlineString !== lastOutlineRef.current) {
        console.log("Tiptap: External outline change detected.", initialOutline);
        
        if (isInitialLoad.current) {
          // Beim ersten Laden: normales setContent
          console.log("Tiptap: Initial load - setting content normally");
          const html = convertOutlineToHTML(initialOutline);
          editor.commands.setContent(html, true);
          isInitialLoad.current = false;
        } else {
          // Bei späteren Updates: intelligente Aktualisierung
          console.log("Tiptap: Subsequent update - preserving existing content");
          updateEditorWithNewOutline(initialOutline, editor);
          // Manuell die letzte Outline-Referenz aktualisieren
          lastOutlineRef.current = newInitialOutlineString;
          // onOutlineUpdate aufrufen, um die Synchronisation sicherzustellen
          if (onOutlineUpdate) {
            onOutlineUpdate(initialOutline);
          }
        }
      }
    }
  }, [initialOutline, editor, convertOutlineToHTML, updateEditorWithNewOutline, onOutlineUpdate]);

  const extractHeadingsFromEditor = (editor: Editor): OutlineItem[] => {
    const extractedOutline: OutlineItem[] = [];
    const parentStack: OutlineItem[] = [];

    editor.state.doc.forEach(node => {
      if (node.type.name === CustomHeading.name) {
        const editorHLevel = node.attrs.level;
        
        if (editorHLevel === 1 && !node.attrs['data-outline-id']) {
           return; 
        }

        const outlineIdFromAttr = node.attrs['data-outline-id'] as string | null;
        const itemLevelFromAttr = node.attrs['data-outline-level'] as number | null;
        
        let currentItemLevel = itemLevelFromAttr !== null ? itemLevelFromAttr : (editorHLevel ? editorHLevel - 1 : 1);
        
        if (currentItemLevel <= 0) {
          console.warn("Tiptap: extractHeadings - Skipping heading with invalid level:", node.textContent);
          return;
        }
        currentItemLevel = Math.min(currentItemLevel, 3);

        const fullText = node.textContent || '';
        const title = fullText.replace(/^[\d\.]+\s*/, '').trim();

        const newItem: OutlineItem = {
          id: outlineIdFromAttr || `editor-item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          title: title,
          level: currentItemLevel,
          children: [],
        };

        while (parentStack.length > 0 && parentStack[parentStack.length - 1].level >= newItem.level) {
          parentStack.pop();
        }

        if (newItem.level === 1) {
          extractedOutline.push(newItem);
        } else {
          const parent = parentStack[parentStack.length - 1];
          if (parent && parent.level === newItem.level - 1) {
            parent.children = parent.children || [];
            parent.children.push(newItem);
          } else {
            console.warn("Tiptap: extractHeadings - Orphaned heading, adding to root or last valid parent with adjusted level:", newItem);
            if (parentStack.length > 0) {
                const lastKnownParent = parentStack[parentStack.length - 1];
                newItem.level = lastKnownParent.level + 1;
                lastKnownParent.children = lastKnownParent.children || [];
                lastKnownParent.children.push(newItem);
            } else {
                 newItem.level = 1; 
                 extractedOutline.push(newItem);
            }
          }
        }
        parentStack.push(newItem);
      }
    });
    return extractedOutline;
  };

  const closeContextMenu = useCallback(() => {
    setContextMenuState({ isVisible: false, position: null });
  }, []);

  const handleContextMenuGenerateText = async (userPromptFromContextMenu?: string) => {
    if (!editor) return;
    closeContextMenu();
    setIsGeneratingTextFromContext(true);
    const NUM_SOURCES = 3;
    const editorHTML = editor.getHTML();
    const effectivePrompt = userPromptFromContextMenu?.trim() || "Schreibe einen passenden wissenschaftlichen Textabschnitt basierend auf dem aktuellen Kontext...";
    try {
      const response = await generateTextFromQuery(editorHTML, effectivePrompt, NUM_SOURCES);
      if (response.generated_text) {
        const sourceMap = new Map(response.sources.map(s => [s.chunk_id, s]));
        const contentToInsert: Array<any> = [];
        const citationRegex = /\[ID:([a-f0-9-]+(?:-[a-f0-9]+)*)\]/gi;
        let lastIndex = 0; let match;
        while ((match = citationRegex.exec(response.generated_text)) !== null) {
          const textBefore = response.generated_text.substring(lastIndex, match.index);
          if (textBefore) contentToInsert.push({ type: 'text', text: textBefore });
          const chunkId = match[1]; const sourceData = sourceMap.get(chunkId);
          if (sourceData && editor.schema.nodes.citation) {
            const attrs = { chunkId, author: sourceData.author, year: sourceData.year, page: sourceData.page, title: sourceData.title, displayText: `(${sourceData.author||'Autor'}, ${sourceData.year||'Jahr'})`};
            contentToInsert.push({ type: 'citation', attrs });
          } else contentToInsert.push({ type: 'text', text: match[0] });
          lastIndex = citationRegex.lastIndex;
        }
        const textAfter = response.generated_text.substring(lastIndex);
        if (textAfter) contentToInsert.push({ type: 'text', text: textAfter });

        if (contentToInsert.length > 0) {
          editor.chain().focus().insertContent(contentToInsert).run();
        }
      } else { alert("Kein Text von der KI generiert (Kontextmenü)."); }
    } catch (e: any) { alert(`Fehler bei Textgenerierung (Kontextmenü): ${e?.message || 'Unbekannt'}`); }
    finally { setIsGeneratingTextFromContext(false); }
  };

  const handleContextMenuRewriteText = (prompt?: string) => {
    if (!editor) return;
    closeContextMenu();
    if (editor.state.selection.empty && !prompt) {
        alert("Bitte Text für 'Umschreiben' markieren oder eine Anweisung im Kontextmenü-Prompt geben.");
        return;
    }
    alert(`Aktion 'Umschreiben' aus Kontextmenü getriggert. Prompt: ${prompt || '(kein Prompt)'}. Markierter Text: ${editor.state.selection.empty ? 'Nichts' : editor.state.doc.textBetween(editor.state.selection.from, editor.state.selection.to, ' ')}`);
  };

  const handleContextMenuFindSources = () => {
    if (!editor) return;
    closeContextMenu();
    if (editor.state.selection.empty) {
        alert("Bitte Text für 'Quellen suchen' markieren.");
        return;
    }
    alert("Aktion 'Quellen suchen' aus Kontextmenü getriggert. Markierter Text: " + editor.state.doc.textBetween(editor.state.selection.from, editor.state.selection.to, ' '));
  };

  if (!editor) {
    return <div className="w-full h-full flex items-center justify-center"><p>Editor wird geladen...</p></div>;
  }

  return (
    <div className="w-full h-full flex flex-col relative bg-white">
      <EditorToolbar editor={editor} />
      <EditorBubbleMenu editor={editor} />
      <EditorContent
        editor={editor}
        className="flex-grow border border-gray-300 rounded-md p-6 overflow-y-auto prose prose-sm sm:prose lg:prose-lg xl:prose-xl max-w-none focus:outline-none"
      />
      {contextMenuState.isVisible && contextMenuState.position && editor && (
        <EditorContextMenu
          editor={editor}
          position={{ top: contextMenuState.position.y, left: contextMenuState.position.x }}
          isVisible={contextMenuState.isVisible}
          onClose={closeContextMenu}
          onGenerateText={handleContextMenuGenerateText}
          onRewriteText={handleContextMenuRewriteText}
          onFindSources={handleContextMenuFindSources}
          isGenerating={isGeneratingTextFromContext}
        />
      )}
    </div>
  );
};

export default Tiptap;