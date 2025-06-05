// src/components/editor/extensions/CitationNode.ts
import { Node, mergeAttributes, Range } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import CitationView from './CitationView';

export interface CitationOptions {
  HTMLAttributes: Record<string, any>,
}

// Das `declare module` für die Commands muss jetzt die neuen Attribute widerspiegeln,
// wenn du sie direkt beim Command übergeben willst.
// Oder du übergibst weiterhin nur chunkId und einen optionalen Fallback-displayText,
// und die CitationView holt sich die Daten anderweitig.
// Für die aktuelle Implementierung, wo handleGenerateText alle Attribute setzt, ist es so besser:
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    citation: {
      // Passe die Attribute an, die deine Commands jetzt erwarten
      setCitation: (attributes: {
        chunkId: string;
        author?: string | null;
        year?: number | null;
        page?: number | null;
        title?: string | null;
        // displayText ist jetzt optional oder wird ganz entfernt, da dynamisch
        displayText?: string | null; // Falls du ihn noch als Fallback willst
      }) => ReturnType,
      insertCitation: (attributes: {
        chunkId: string;
        author?: string | null;
        year?: number | null;
        page?: number | null;
        title?: string | null;
        displayText?: string | null;
      }, range?: Range) => ReturnType,
    }
  }
}

export const Citation = Node.create<CitationOptions>({
  name: 'citation',
  group: 'inline',
  inline: true,
  selectable: true,
  atom: true,

  addAttributes() {
    return {
      chunkId: {
        default: null,
        parseHTML: element => element.getAttribute('data-chunk-id'),
        renderHTML: attributes => ({ 'data-chunk-id': attributes.chunkId }),
      },
      // NEUE ATTRIBUTE für Roh-Metadaten:
      author: {
        default: 'Unbekannt',
        parseHTML: element => element.getAttribute('data-author'),
        renderHTML: attributes => ({ 'data-author': attributes.author }),
      },
      year: {
        default: null, // Erlaube null für das Jahr
        parseHTML: element => {
          const year = element.getAttribute('data-year');
          return year ? parseInt(year, 10) : null;
        },
        renderHTML: attributes => (attributes.year !== null ? { 'data-year': String(attributes.year) } : {}),
      },
      page: {
        default: null, // Erlaube null für die Seite
        parseHTML: element => {
          const page = element.getAttribute('data-page');
          return page ? parseInt(page, 10) : null;
        },
        renderHTML: attributes => (attributes.page !== null ? { 'data-page': String(attributes.page) } : {}),
      },
      title: {
        default: 'Unbekannter Titel',
        parseHTML: element => element.getAttribute('data-title'),
        renderHTML: attributes => ({ 'data-title': attributes.title }),
      },
      // displayText ist jetzt eher ein Fallback oder wird von CitationView nicht mehr direkt genutzt
      // Du kannst es behalten, wenn du es für parseHTML/renderHTML als Fallback brauchst
      displayText: {
        default: '(Quelle)', // Ein generischerer Default, da es dynamisch wird
        parseHTML: element => element.getAttribute('data-display-text') || element.innerText,
        renderHTML: attributes => ({ 'data-display-text': attributes.displayText }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-citation][data-chunk-id]', // Dein primärer Parser
        getAttrs: node => {
            const domNode = node as HTMLElement;
            const yearAttr = domNode.getAttribute('data-year');
            const pageAttr = domNode.getAttribute('data-page');
            return {
                chunkId: domNode.getAttribute('data-chunk-id'),
                author: domNode.getAttribute('data-author') || 'Unbekannt',
                year: yearAttr ? parseInt(yearAttr, 10) : null,
                page: pageAttr ? parseInt(pageAttr, 10) : null,
                title: domNode.getAttribute('data-title') || 'Unbekannter Titel',
                displayText: domNode.getAttribute('data-display-text') || domNode.innerText,
            };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes, node }) {
    // renderHTML sollte jetzt auch die neuen data-Attribute schreiben
    return [
        'span',
        mergeAttributes(
            this.options.HTMLAttributes,
            HTMLAttributes,
            {
                'data-citation': '',
                'data-chunk-id': node.attrs.chunkId,
                'data-author': node.attrs.author,
                'data-year': node.attrs.year !== null ? String(node.attrs.year) : undefined, // Nur setzen, wenn nicht null
                'data-page': node.attrs.page !== null ? String(node.attrs.page) : undefined, // Nur setzen, wenn nicht null
                'data-title': node.attrs.title,
                'data-display-text': node.attrs.displayText // Der Fallback-Displaytext
            }
        ),
        // Der sichtbare Text wird jetzt von CitationView.tsx dynamisch generiert.
        // Für den Fallback oder No-JS kannst du hier node.attrs.displayText anzeigen.
        node.attrs.displayText
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(CitationView);
  },

  addCommands() {
    // Die Attribute in den Commands müssen jetzt die neuen Felder widerspiegeln
    return {
      setCitation: (attributes) => ({ commands }) => {
        return commands.insertContent({ type: this.name, attrs: attributes });
      },
      insertCitation: (attributes, range) => ({ tr, dispatch }) => {
        // ... (Logik bleibt gleich, aber 'attributes' enthält jetzt mehr Felder)
        const { selection } = tr;
        const node = this.type.create(attributes); // Erstellt Node mit allen neuen Attributen
        if (dispatch) {
          if (range) {
            tr.replaceWith(range.from, range.to, node);
          } else {
            tr.replaceSelectionWith(node);
          }
        }
        return true;
      },
    };
  },
});

export default Citation;