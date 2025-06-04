// src/components/editor/extensions/CitationNode.ts
import { Node, mergeAttributes, Range } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react' // Wichtig
import CitationView from './CitationView' // Die React-Komponente, die wir erstellen werden

export interface CitationOptions {
  HTMLAttributes: Record<string, any>,
}

// Das `declare module` für die Commands bleibt gleich
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    citation: {
      setCitation: (attributes: { chunkId: string; displayText: string }) => ReturnType,
      insertCitation: (attributes: { chunkId: string; displayText: string }, range?: Range) => ReturnType,
    }
  }
}

export const Citation = Node.create<CitationOptions>({
  name: 'citation',
  group: 'inline',
  inline: true,
  selectable: true, // Wichtig, damit man den Node als Ganzes auswählen/löschen kann
  atom: true,      // Behandelt den Node als eine unteilbare Einheit

  addAttributes() {
    return {
      chunkId: {
        default: null,
        parseHTML: element => element.getAttribute('data-chunk-id'),
        renderHTML: attributes => {
          if (!attributes.chunkId) return {};
          return { 'data-chunk-id': attributes.chunkId };
        },
      },
      displayText: {
        default: 'Unbekannte Quelle',
        parseHTML: element => element.getAttribute('data-display-text') || element.innerText,
        renderHTML: attributes => {
          if (!attributes.displayText) return {};
          // Der displayText wird von der ReactNodeView gerendert,
          // aber wir behalten es hier für den Fall, dass HTML ohne JS geparst wird
          // oder für Copy-Paste Szenarien.
          return { 'data-display-text': attributes.displayText };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        // Erkennt einen Span mit data-citation und data-chunk-id
        // Dies ist das Format, das renderHTML (unten) erzeugt, falls NodeView nicht verwendet wird
        // oder beim Kopieren/Einfügen von HTML.
        tag: 'span[data-citation][data-chunk-id]',
        getAttrs: node => {
            const domNode = node as HTMLElement;
            return {
                chunkId: domNode.getAttribute('data-chunk-id'),
                displayText: domNode.getAttribute('data-display-text') || domNode.innerText,
            };
        },
      },
    ];
  },

  // renderHTML wird verwendet, wenn Tiptap HTML serialisiert (z.B. editor.getHTML())
  // oder als Fallback, wenn keine NodeView vorhanden ist.
  // Die NodeView kümmert sich um die Darstellung im Editor.
  renderHTML({ HTMLAttributes, node }) {
    // Hier ist es wichtig, dass die Attribute (chunkId, displayText) korrekt im HTML gespeichert werden,
    // damit parseHTML sie wieder lesen kann.
    return [
        'span',
        mergeAttributes(
            this.options.HTMLAttributes,
            HTMLAttributes,
            {
                'data-citation': '', // Nur ein Marker-Attribut
                'data-chunk-id': node.attrs.chunkId,
                'data-display-text': node.attrs.displayText
            }
        ),
        node.attrs.displayText // Der sichtbare Text
    ];
  },

  // HIER KOMMT DIE MAGIE: Wir verwenden eine React-Komponente für die Darstellung
  addNodeView() {
    return ReactNodeViewRenderer(CitationView);
  },

  // Die Commands bleiben gleich
  addCommands() {
    return {
      setCitation: attributes => ({ commands }) => {
        return commands.insertContent({ type: this.name, attrs: attributes });
      },
      insertCitation: (attributes, range) => ({ tr, dispatch }) => {
        const { selection } = tr;
        const position = range?.from ?? selection.from;
        const node = this.type.create(attributes);

        if (dispatch) {
          if (range) {
            tr.replaceWith(range.from, range.to, node);
          } else {
            // Wenn keine Range gegeben ist (wie in unserem neuen Fall),
            // an der aktuellen Selektion einfügen.
            // Wenn die Selektion kollabiert ist, fügt es an dieser Stelle ein.
            // Wenn Text markiert ist, ersetzt es die Selektion.
            // Da wir vorher `setTextSelection(to)` machen, ist die Selektion kollabiert.
            tr.replaceSelectionWith(node);
          }
        }
        return true;
      },
    };
  },
});

export default Citation;