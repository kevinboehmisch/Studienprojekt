// src/components/editor/SourceSelectionPopover.tsx

import React from 'react';
import { SourceChunk } from '@/services/llmService'; // Oder wo immer SourceChunk definiert ist
import { BookOpen, CheckCircle } from 'lucide-react';

export interface SourceSelectionPopoverProps { // Exportiere, damit EditorBubbleMenu es verwenden kann
  sources: SourceChunk[];
  onSelectSource: (source: SourceChunk) => void;
  onClose: () => void;
  position?: { top: number; left: number } | null; // <--- HIER: Mache position optional mit '?'
}

const SourceSelectionPopover: React.FC<SourceSelectionPopoverProps> = ({
  sources,
  onSelectSource,
  onClose,
  position, // Bleibt hier, ist jetzt aber optional
}) => {
  // Wenn die Positionierung ausschließlich durch den Parent-Div in EditorBubbleMenu erfolgt,
  // und diese Komponente sich nicht mehr selbst absolut positioniert,
  // dann wird die 'position'-Prop hier drin vielleicht gar nicht mehr direkt für CSS verwendet.
  // Die Klassen wie "absolute z-50..." würden dann vom Parent kommen.
  // In unserem Fall positioniert der Parent, daher ist die 'position'-Prop hier
  // für das direkte Styling dieses Divs nicht mehr nötig.

  // Die ursprüngliche Logik, die 'position' für das Styling verwendete, war:
  /*
  if (!position || sources.length === 0) { // Wenn position hier noch Pflicht wäre
    return null;
  }
  // ...
  <div
    className="absolute z-50 bg-white ..." // Diese Klassen sind jetzt am Wrapper-Div in EditorBubbleMenu
    style={{ top: position.top, left: position.left }} // Dieser Style ist jetzt am Wrapper-Div
  >
  */

  // Angepasster Code für den Fall, dass der Parent die Positionierung übernimmt:
  // Die Klassen für das Aussehen bleiben hier.
  if (sources.length === 0) { // Nur prüfen, ob Quellen da sind
    return null;
  }

  const formatSourceDisplay = (source: SourceChunk) => {
    // ... (deine Formatierungslogik)
    const author = source.document_author || 'Unbekannt';
    const year = source.publication_year || 'N/A';
    const page = source.page_number !== null ? `S. ${source.page_number + 1}` : 'Seite unbekannt';
    const title = source.document_title && source.document_title.length > 50
                  ? `${source.document_title.substring(0, 47)}...`
                  : source.document_title || 'Unbekannter Titel';
    return `${author} (${year}), ${title}, ${page}`;
  };

  return (
    // Die Klassen für das grundlegende Aussehen und Verhalten des Popovers bleiben hier.
    // Die absolute Positionierung und zIndex kommen vom Parent-Div in EditorBubbleMenu.
    <div
      className="bg-white border border-gray-300 rounded-lg shadow-xl p-3 max-w-md w-full"
      // style prop für top/left wird hier nicht mehr benötigt, wenn der Parent positioniert
      onClick={(e) => e.stopPropagation()} // Verhindert Schließen bei Klick in Popover
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
      {sources.length > 0 ? (
        <ul className="space-y-2 max-h-60 overflow-y-auto">
          {sources.map((source, index) => (
            <li
              key={source.chunk_id || `source-${index}`}
              className="p-2 hover:bg-gray-100 rounded-md cursor-pointer border border-transparent hover:border-gray-200"
              onClick={() => onSelectSource(source)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-grow">
                    <p className="text-sm font-medium text-indigo-600">
                    {formatSourceDisplay(source)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2" title={source.chunk_content}>
                    {source.chunk_content}
                    </p>
                </div>
                <button
                    className="ml-2 p-1 text-green-500 hover:text-green-700"
                    title="Diese Quelle auswählen"
                >
                    <CheckCircle size={18} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-gray-500">Keine Quellen gefunden.</p> // Sollte durch die Prüfung oben nicht erreicht werden
      )}
    </div>
  );
};

export default SourceSelectionPopover;