// src/components/editor/SourceSelectionPopover.tsx

import React from 'react';
import { SourceChunk } from '@/services/llmService';
import { CheckCircle } from 'lucide-react'; // BookOpen wird hier nicht direkt verwendet
// Importiere die Formatierungsfunktion und den Stil-Typ
import { formatAuthors } from '@/utils/citationFormatter'; // Passe den Pfad ggf. an
import type { CitationStyle } from '@/utils/citationFormatter'; // Nur den Typ importieren

export interface SourceSelectionPopoverProps {
  sources: SourceChunk[];
  onSelectSource: (source: SourceChunk) => void;
  onClose: () => void;
  position?: { top: number; left: number } | null;
}

const SourceSelectionPopover: React.FC<SourceSelectionPopoverProps> = ({
  sources,
  onSelectSource,
  onClose,
  // position Prop wird hier nicht direkt für das Styling verwendet, wenn der Parent positioniert
}) => {
  if (sources.length === 0) {
    return null;
  }

  const formatSourceDisplay = (source: SourceChunk) => {
    // Verwende hier denselben Stil wie in CitationView für Konsistenz,
    // oder einen spezifischen Stil für die Vorschau.
    const previewStyle: CitationStyle = 'default'; // oder 'apa'

    // Verwende formatAuthors für die Autorenanzeige
    const displayAuthor = formatAuthors(source.document_author, previewStyle);

    const year = source.publication_year || 'N.A.'; // 'N.A.' für Not Available oder N.D. für No Date
    const page = source.page_number !== null ? `S. ${source.page_number + 1}` : 'S. unbek.';
    const title = source.document_title && source.document_title.length > 50
                  ? `${source.document_title.substring(0, 47)}...`
                  : source.document_title || 'Unbek. Titel';

    // Baue den Anzeigetext zusammen
    let displayText = `${displayAuthor}`;
    if (source.publication_year) { // Nur hinzufügen, wenn Jahr vorhanden
        displayText += ` (${year})`;
    } else {
        displayText += ` (N.D.)`; // Falls kein Jahr vorhanden
    }
    displayText += `, ${title}`;
    if (source.page_number !== null) { // Nur hinzufügen, wenn Seite vorhanden
        displayText += `, ${page}`;
    }

    return displayText;
  };

  return (
    <div
      className="bg-white border border-gray-300 rounded-lg shadow-xl p-3 max-w-md w-full"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-md font-semibold text-gray-700">Quelle auswählen</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600"
          title="Schließen"
        >
          ×
        </button>
      </div>
      <ul className="space-y-2 max-h-60 overflow-y-auto">
        {sources.map((source) => ( // Index nicht mehr zwingend für Key, wenn chunk_id immer da ist
          <li
            key={source.chunk_id} // chunk_id sollte eindeutig sein
            className="p-2 hover:bg-gray-100 rounded-md cursor-pointer border border-transparent hover:border-gray-200"
            onClick={() => onSelectSource(source)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-grow mr-2"> {/* Etwas Abstand zum Button */}
                  <p className="text-sm font-medium text-indigo-600">
                  {formatSourceDisplay(source)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2" title={source.chunk_content}>
                  {source.chunk_content}
                  </p>
              </div>
              <button
                  className="p-1 text-green-500 hover:text-green-700 flex-shrink-0" // flex-shrink-0 verhindert Schrumpfen
                  title="Diese Quelle auswählen"
              >
                  <CheckCircle size={18} />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default SourceSelectionPopover;