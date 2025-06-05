// src/components/sidemenu/SideMenu.tsx
'use client'

import React, { useState } from 'react';
import {
  ChevronLeft, ChevronRight, Files, ListTree, BookOpen, Plus, Search, Settings, X
} from 'lucide-react';

// Typen für die Daten (vereinfacht für das Beispiel)
interface ProjectFile {
  id: string;
  name: string;
  lastModified: string; // z.B. "2024-07-10"
  active?: boolean; // Um die aktuell geöffnete Datei hervorzuheben
}

interface OutlineItem {
  id: string;
  title: string;
  level: number;
  onClick?: () => void; // Aktion beim Klicken
}

interface SourceItem {
  id: string;
  displayCitation: string; // z.B. "(Müller et al., 2023)"
  fullCitation?: string;    // Für Tooltip oder Detailansicht
  previewImageUrl?: string; // URL zu einem kleinen Vorschaubild (optional)
  pdfUrl?: string; // Optional: direkter Link zum PDF
}

type ActivePanelView = 'projects' | 'outline' | 'sources' | null;

const SideMenu: React.FC = () => {
  const [isPanelOpen, setIsPanelOpen] = useState(false); // Ist irgendein Panel offen?
  const [activeView, setActiveView] = useState<ActivePanelView>(null); // Welches Panel ist offen?

  // Beispieldaten
  const projectFiles: ProjectFile[] = [
    { id: 'proj1', name: 'Einleitung.txt', lastModified: '10.07.2024', active: true },
    { id: 'proj2', name: 'Methodik_Entwurf.txt', lastModified: '08.07.2024' },
    { id: 'proj3', name: 'Diskussion_Rohfassung.txt', lastModified: '05.07.2024' },
  ];

  const outlineItems: OutlineItem[] = [
    { id: 'o1', title: '1. Einleitung', level: 1 },
    { id: 'o1.1', title: '1.1 Problemstellung', level: 2 },
    { id: 'o2', title: '2. Theoretischer Rahmen', level: 1 },
    { id: 'o2.1', title: '2.1 Schlüsselkonzepte', level: 2 },
    { id: 'o2.2', title: '2.2 Aktuelle Forschung', level: 2 },
  ];

  const sourceItems: SourceItem[] = [
    { id: 'src1', displayCitation: '(Müller et al., 2023)', fullCitation: 'Müller, A., Schmidt, B., & Meier, C. (2023). Titel der Studie. Journal.', previewImageUrl: 'https://via.placeholder.com/40x50/E0E7FF/4338CA?text=PDF', pdfUrl: '#' },
    { id: 'src2', displayCitation: '(Schulze, 2022)', fullCitation: 'Schulze, T. (2022). Ein weiteres wichtiges Paper. Conference Proceedings.', previewImageUrl: 'https://via.placeholder.com/40x50/DBEAFE/1D4ED8?text=PDF' },
    { id: 'src3', displayCitation: '(Huber & Keller, 2024)', fullCitation: 'Huber, F., & Keller, S. (2024). Relevante Erkenntnisse. Buchkapitel.', previewImageUrl: 'https://via.placeholder.com/40x50/E0F2FE/0891B2?text=PDF' },
  ];

  const togglePanel = (view: ActivePanelView) => {
    if (activeView === view && isPanelOpen) {
      setIsPanelOpen(false); // Schließe, wenn dasselbe Icon geklickt wird und Panel offen ist
      // setActiveView(null); // Optional: Ansicht zurücksetzen, wenn Panel immer mit spezifischer Ansicht öffnen soll
    } else {
      setActiveView(view);
      setIsPanelOpen(true);
    }
  };

  const closePanel = () => {
    setIsPanelOpen(false);
    // setActiveView(null); // Optional: Ansicht zurücksetzen
  };

  const renderPanelContent = () => {
    switch (activeView) {
      case 'projects':
        return (
          <div className="p-3 space-y-2">
            {projectFiles.map(file => (
              <div
                key={file.id}
                className={`p-2 rounded-md cursor-pointer hover:bg-gray-100 ${file.active ? 'bg-gray-100 ' : 'bg-white'}`}
              >
                <p className="text-sm font-medium text-gray-800 truncate">{file.name}</p>
                <p className="text-xs text-gray-500">Zuletzt bearbeitet: {file.lastModified}</p>
              </div>
            ))}
            <button className="w-full mt-2 flex items-center justify-center py-2 px-3 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors">
              <Plus size={16} className="mr-1.5" /> Neues Textdokument
            </button>
          </div>
        );
      case 'outline':
        return (
          <div className="p-3">
            <ul className="space-y-1">
              {outlineItems.map(item => (
                <li key={item.id} className={`pl-${(item.level - 1) * 3} group`}>
                  <a href="#" onClick={item.onClick} className="flex items-center py-1.5 px-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md group-hover:text-blue-600">
                    <span className="mr-2 text-gray-400 group-hover:text-blue-500">•</span> {item.title}
                  </a>
                </li>
              ))}
            </ul>
             <button className="w-full mt-3 flex items-center justify-center py-2 px-3 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors">
              <Plus size={16} className="mr-1.5" /> Gliederungspunkt
            </button>
          </div>
        );
      case 'sources':
        return (
          <div className="p-3 space-y-2">
            {sourceItems.map(source => (
              <div key={source.id} title={source.fullCitation} className="flex items-start p-2 rounded-md cursor-pointer hover:bg-gray-100 bg-gray-50 border border-gray-200">
                {source.previewImageUrl && (
                  <img src={source.previewImageUrl} alt="Quelle" className="w-10 h-12 object-cover rounded-sm mr-3 flex-shrink-0" />
                )}
                {!source.previewImageUrl && (
                    <div className="w-10 h-12 bg-indigo-100 rounded-sm mr-3 flex-shrink-0 flex items-center justify-center">
                        <BookOpen size={20} className="text-indigo-500"/>
                    </div>
                )}
                <div className="overflow-hidden">
                  <p className="text-xs font-semibold text-indigo-700 truncate">{source.displayCitation}</p>
                  <p className="text-xs text-gray-600 truncate mt-0.5">{source.fullCitation?.substring(0, 60)}...</p>
                </div>
                {/* Optional: Button um PDF anzuzeigen, falls pdfUrl vorhanden */}
                {/* {source.pdfUrl && <button onClick={() => window.open(source.pdfUrl, '_blank')}><Link2 size={14} className="ml-2 text-gray-400 hover:text-blue-500"/></button>} */}
              </div>
            ))}
            <button className="w-full mt-2 flex items-center justify-center py-2 px-3 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors">
              <Plus size={16} className="mr-1.5" /> Quelle hinzufügen
            </button>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className={`flex h-full transition-all duration-300 ease-in-out bg-white shadow-sm`}>
      {/* Icon Bar (immer sichtbar) */}
      <div className="w-16 bg-white text-white flex flex-col items-center py-4 space-y-3 border-r border-gray-300 flex-shrink-0">
        <button
          onClick={() => togglePanel('projects')}
          title="Projekte/Dateien"
          className={`p-2 rounded-lg hover:bg-gray-200 ${activeView === 'projects' && isPanelOpen ? 'bg-blue-600 text-white' : 'text-gray-400'}`}
        >
          <Files size={22} />
        </button>
        <button
          onClick={() => togglePanel('outline')}
          title="Gliederung"
          className={`p-2 rounded-lg hover:bg-gray-200 ${activeView === 'outline' && isPanelOpen ? 'bg-blue-600 text-white' : 'text-gray-400'}`}
        >
          <ListTree size={22} />
        </button>
        <button
          onClick={() => togglePanel('sources')}
          title="Quellen"
          className={`p-2 rounded-lg hover:bg-gray-200 ${activeView === 'sources' && isPanelOpen ? 'bg-blue-600 text-white' : 'text-gray-400'}`}
        >
          <BookOpen size={22} />
        </button>
        {/* Weitere Icons wie Suche, Einstellungen etc. können hierhin */}
        <div className="mt-auto space-y-3">
            <button title="Suche" className="p-2 rounded-lg text-gray-400 hover:bg-gray-200"><Search size={20}/></button>
            <button title="Einstellungen" className="p-2 rounded-lg text-gray-400 hover:bg-gray-200"><Settings size={20}/></button>
        </div>
      </div>

      {/* Aufklappbares Panel */}
      <div
               className={`transition-all duration-300 ease-in-out overflow-hidden ${
          isPanelOpen ? 'w-72 border-r border-gray-200' : 'w-0'
        } bg-white h-full flex flex-col`} // bg-white für das Panel
      >
        {isPanelOpen && (
          <>
            <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-white">
              <h2 className="text-md font-semibold text-gray-700">
                {activeView === 'projects' && 'Projektdateien'}
                {activeView === 'outline' && 'Gliederung'}
                {activeView === 'sources' && 'Quellenübersicht'}
              </h2>
              <button onClick={closePanel} className="p-1 text-gray-400 hover:text-gray-600 rounded-md">
                <X size={18} />
              </button>
            </div>
            <div className="flex-grow overflow-y-auto">
              {renderPanelContent()}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SideMenu;