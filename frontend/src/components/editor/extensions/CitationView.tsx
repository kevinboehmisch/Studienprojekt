// src/components/editor/extensions/CitationView.tsx
import React, { useContext } from 'react'; // useContext, falls du den Stil global verwaltest
import { NodeViewWrapper, NodeViewProps } from '@tiptap/react';
// HIER DER WICHTIGE IMPORT:
import { formatCitation, CitationStyle, CitationData } from '@/utils/citationFormatter';
// import { CitationStyleContext } from '@/contexts/CitationStyleContext'; // Beispiel für einen Context

const CitationView: React.FC<NodeViewProps> = ({ node, editor }) => {
  console.log("[CitationView] EINGEHENDE Node Attributes:", JSON.stringify(node.attrs, null, 2));

  // Annahme: currentCitationStyle kommt aus einem globalen State/Context
  // Für dieses Beispiel hardcoden wir es, bis du die Stil-Auswahl implementiert hast:
  const currentStyle: CitationStyle = 'default'; // oder 'apa', 'ieee' etc. zum Testen
  // WICHTIG: Stelle sicher, dass dein 'CitationStyle' Typ in citationFormatter.ts 'default' enthält.

  // Hole alle relevanten Roh-Attribute vom Node
  const { chunkId, author, year, page, title } = node.attrs;

  // Bereite die Daten für den Formatter vor
  const citationData: CitationData = {
    author: author, // Dieser 'author' kommt jetzt aus node.attrs
    year: year,
    page: page,
    title: title,
    // citationNumber: (currentStyle === 'ieee') ? getIEEEcitationNumber(editor, chunkId) : undefined,
  };

  // Rufe den Formatter auf, um den Anzeigetext dynamisch zu generieren
  const dynamicallyFormattedDisplayText = formatCitation(citationData, currentStyle);
  console.log(`[CitationView] Dynamisch formatierter Text für Stil "${currentStyle}":`, dynamicallyFormattedDisplayText);

  const handleOpenSource = (event: React.MouseEvent) => {
    event.preventDefault();
    if (chunkId) {
      // Zeige im Alert den dynamisch formatierten Text und die Rohdaten
      alert(`Aktion für Chunk ID: ${chunkId}\nAngezeigter Text im Editor: ${dynamicallyFormattedDisplayText}\n\nQuell-Details aus Node:\nAutor: ${author}\nJahr: ${year}\nSeite: ${page !== null ? page + 1 : 'N/A'}\nTitel: ${title}`);
    } else {
      alert("Keine Chunk ID für diese Zitation vorhanden.");
    }
  };

  return (
    <NodeViewWrapper
      as="span"
      className="citation-node inline-block bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-0.5 rounded-md cursor-pointer transition-colors duration-150"
      onClick={handleOpenSource}
      title={`Quelle (ID: ${chunkId || 'unbekannt'}) - Angezeigt als: ${currentStyle}`}
      data-chunk-id={chunkId}
      // Diese data-Attribute sind gut für Debugging und ggf. externe Tools
      data-author={author}
      data-year={year}
      data-page={page}
      data-title={title}
      // data-display-text hier nicht mehr nötig, da der Inhalt dynamisch ist
    >
      {dynamicallyFormattedDisplayText} {/* HIER DEN DYNAMISCH FORMATIERTEN TEXT ANZEIGEN */}
    </NodeViewWrapper>
  );
};

export default CitationView;