// src/components/editor/extensions/CitationView.tsx
import React from 'react';
import { NodeViewWrapper, NodeViewProps } from '@tiptap/react';
import { ExternalLink } from 'lucide-react'; // Optional für ein Icon

// Annahme: Du hast irgendwo eine Funktion, die eine URL zum Chunk generiert oder eine Aktion auslöst.
// Dies ist nur ein Platzhalter. Du müsstest die Logik implementieren, um
// tatsächlich zur Quelle zu springen (z.B. PDF öffnen und zur Seite scrollen,
// oder eine Detailansicht des Chunks in deinem UI anzeigen).
const handleOpenSource = (chunkId: string | null, displayText: string | null) => {
  if (chunkId) {
    alert(`Aktion für Chunk ID: ${chunkId}\nAnzeigetext: ${displayText}\n\nHier könnte man jetzt z.B. eine Detailansicht öffnen oder zu einer URL springen, die den Chunk repräsentiert.`);
    // Beispiel: window.open(`/path/to/document?chunk=${chunkId}`, '_blank');
  } else {
    alert("Keine Chunk ID für diese Zitation vorhanden.");
  }
};

const CitationView: React.FC<NodeViewProps> = ({ node, editor, getPos, deleteNode }) => {
  const { chunkId, displayText } = node.attrs;

  // Klick-Handler für die Interaktion
  const handleClick = (event: React.MouseEvent) => {
    event.preventDefault(); // Verhindert ggf. Standardverhalten, falls es mal ein <a> Tag wird
    handleOpenSource(chunkId, displayText);
  };

  return (
    // NodeViewWrapper ist wichtig für die korrekte Integration in Tiptap
    <NodeViewWrapper
      as="span" // Das HTML-Tag, das diesen Node im Editor repräsentiert
      className="citation-node inline-block bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-0.5 rounded-md cursor-pointer transition-colors duration-150"
      onClick={handleClick}
      title={`Quelle öffnen (ID: ${chunkId || 'unbekannt'})`} // Tooltip
      data-chunk-id={chunkId} // Wichtig, damit die Attribute auch im DOM sind
      data-display-text={displayText}
      // Draggable und andere Tiptap-spezifische Props werden vom Wrapper gehandhabt
    >
      {displayText || '(Quelle)'}
      {/* Optional: Ein kleines Icon hinzufügen */}
      {/* <ExternalLink size={12} className="inline-block ml-1 opacity-70" /> */}
    </NodeViewWrapper>
  );
};

export default CitationView;