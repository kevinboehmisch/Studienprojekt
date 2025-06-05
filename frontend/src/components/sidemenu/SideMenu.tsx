// src/components/sidemenu/SideMenu.tsx
'use client'

import React, { useState, useEffect, useMemo } from 'react';
import {
  ChevronLeft, ChevronRight, Files, ListTree, BookOpen, Plus, Search, Settings, X, 
  ChevronDown, ChevronRight as ChevronRightIcon, Edit2, Trash2
} from 'lucide-react';
// Importiere Typen und Funktionen direkt aus outlineUtils
import { 
  OutlineItem, 
  NumberedOutlineItem, 
  generateNumberedDisplayOutline,
  addOutlineItemRecursively,
  updateOutlineItemTitleRecursively,
  deleteOutlineItemRecursively
} from '../../utils/outlineUtils'; // Pfad prüfen und ggf. anpassen

import SourcesPanel from './SourcesPanel'; // Importiere das SourcesPanel
// Typen für die Daten (vereinfacht für das Beispiel)
interface ProjectFile {
  id: string;
  name: string;
  lastModified: string;
  active?: boolean;
}


type ActivePanelView = 'projects' | 'outline' | 'sources' | null;

interface SideMenuProps {
  outline: OutlineItem[]; 
  onOutlineChange?: (outline: OutlineItem[]) => void;
  onOutlineItemClick?: (item: OutlineItem) => void; 
}

const SideMenu: React.FC<SideMenuProps> = ({ outline, onOutlineChange, onOutlineItemClick }) => {
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [activeView, setActiveView] = useState<ActivePanelView>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const projectFiles: ProjectFile[] = [
    { id: 'proj1', name: 'Einleitung.txt', lastModified: '10.07.2024', active: true },
    { id: 'proj2', name: 'Methodik_Entwurf.txt', lastModified: '08.07.2024' },
    { id: 'proj3', name: 'Diskussion_Rohfassung.txt', lastModified: '05.07.2024' },
  ];

  const sourceItems: SourceItem[] = [
    { id: 'src1', displayCitation: '(Müller et al., 2023)', fullCitation: 'Müller, A., Schmidt, B., & Meier, C. (2023). Titel der Studie. Journal.', previewImageUrl: 'https://via.placeholder.com/40x50/E0E7FF/4338CA?text=PDF', pdfUrl: '#' },
    { id: 'src2', displayCitation: '(Schulze, 2022)', fullCitation: 'Schulze, T. (2022). Ein weiteres wichtiges Paper. Conference Proceedings.', previewImageUrl: 'https://via.placeholder.com/40x50/DBEAFE/1D4ED8?text=PDF' },
    { id: 'src3', displayCitation: '(Huber & Keller, 2024)', fullCitation: 'Huber, F., & Keller, S. (2024). Relevante Erkenntnisse. Buchkapitel.', previewImageUrl: 'https://via.placeholder.com/40x50/E0F2FE/0891B2?text=PDF' },
  ];

  const displayOutline = useMemo(() => {
    return generateNumberedDisplayOutline(outline);
  }, [outline]);

  useEffect(() => {
    const mainChapters = outline.filter(item => item.level === 1).map(item => item.id);
    if (mainChapters.length > 0 && expandedItems.size === 0) { // Nur initial setzen, wenn noch nichts expanded ist
        setExpandedItems(new Set(mainChapters));
    }
  }, [outline, expandedItems.size]); // expandedItems.size in Abhängigkeit aufnehmen, um Re-Triggering zu kontrollieren

  const togglePanel = (view: ActivePanelView) => {
    if (activeView === view && isPanelOpen) {
      setIsPanelOpen(false);
    } else {
      setActiveView(view);
      setIsPanelOpen(true);
    }
  };

  const closePanel = () => {
    setIsPanelOpen(false);
  };

  const toggleExpanded = (itemId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  };

  const startEditing = (item: OutlineItem) => { 
    setEditingId(item.id);
    setEditingText(item.title); 
  };

  const saveEdit = () => {
    if (editingId && onOutlineChange) {
      const newOutline = updateOutlineItemTitleRecursively(outline, editingId, editingText);
      onOutlineChange(newOutline);
    }
    setEditingId(null);
    setEditingText('');
  };

  const deleteItem = (itemId: string) => {
    if (onOutlineChange) {
      const newOutline = deleteOutlineItemRecursively(outline, itemId);
      onOutlineChange(newOutline);
    }
  };

  const addNewItem = (parentId?: string) => {
    if (onOutlineChange) {
      const newOutline = addOutlineItemRecursively(outline, parentId);
      onOutlineChange(newOutline);
      // Ggf. Parent expandieren, wenn neues Kind hinzugefügt wird
      if (parentId && !expandedItems.has(parentId)) {
        toggleExpanded(parentId);
      }
    }
  };

  const renderOutlineItem = (item: NumberedOutlineItem, depth: number = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.has(item.id);
    const isEditing = editingId === item.id;

    return (
      <div key={item.id} className="select-none">
        <div 
          className={`group flex items-center py-1.5 px-2 hover:bg-gray-100 rounded-md cursor-pointer`}
          style={{ paddingLeft: `${depth * 16 + 8}px` }} 
        >
          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleExpanded(item.id);
              }}
              className="mr-1 p-0.5 hover:bg-gray-200 rounded flex-shrink-0"
            >
              {isExpanded ? <ChevronDown size={14} /> : <ChevronRightIcon size={14} />}
            </button>
          )}
          {!hasChildren && <span className="mr-1 w-[18px] flex-shrink-0" />}
          
          {isEditing ? (
            <input
              type="text"
              value={editingText} 
              onChange={(e) => setEditingText(e.target.value)}
              onBlur={saveEdit}
              onKeyPress={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') { setEditingId(null); setEditingText('');}}}
              className="flex-1 px-1 py-0.5 text-sm border rounded bg-white shadow-sm"
              autoFocus
              onClick={(e) => e.stopPropagation()} 
            />
          ) : (
            <>
              <span 
                className="flex-1 text-sm text-gray-700 group-hover:text-blue-600 truncate"
                onClick={() => onOutlineItemClick?.(item)} 
              >
                {item.numberedTitle} 
              </span>
              <div className="opacity-0 group-hover:opacity-100 flex items-center space-x-0.5 flex-shrink-0 ml-2">
                <button
                  onClick={(e) => { e.stopPropagation(); startEditing(item); }}
                  className="p-1 hover:bg-gray-200 rounded"
                  title="Bearbeiten"
                > <Edit2 size={14} /> </button>
                {item.level < 3 && ( 
                  <button
                    onClick={(e) => { e.stopPropagation(); addNewItem(item.id); }}
                    className="p-1 hover:bg-gray-200 rounded"
                    title="Unterkapitel hinzufügen"
                  > <Plus size={14} /> </button>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); deleteItem(item.id); }}
                  className="p-1 hover:bg-red-100 text-red-600 rounded"
                  title="Löschen"
                > <Trash2 size={14} /> </button>
              </div>
            </>
          )}
        </div>
        {hasChildren && isExpanded && (
          <div>
            {item.children!.map(child => renderOutlineItem(child as NumberedOutlineItem, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const renderPanelContent = () => {
    switch (activeView) {
      case 'projects': /* ... unverändert ... */ return (
          <div className="p-3 space-y-2">
            {projectFiles.map(file => (
              <div
                key={file.id}
                className={`p-2 rounded-md cursor-pointer hover:bg-gray-100 ${file.active ? 'bg-blue-50 border border-blue-200' : 'bg-white'}`}
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
            {outline.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <ListTree size={24} className="mx-auto mb-2 text-gray-400"/>
                <p>Keine Gliederung vorhanden.</p>
                <p className="text-xs mt-1">Die Gliederung kann im Editor oder hier bearbeitet werden.</p>
              </div>
            ) : (
              <div className="space-y-0.5">
                {displayOutline.map(item => renderOutlineItem(item))}
              </div>
            )}
            <button 
              onClick={() => addNewItem()} 
              className="w-full mt-3 flex items-center justify-center py-2 px-3 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors"
            >
              <Plus size={16} className="mr-1.5" /> Hauptkapitel hinzufügen
            </button>
          </div>
        );
       case 'sources':
        // HIER WIRD DIE NEUE KOMPONENTE EINGEFÜGT
        return <SourcesPanel />;
      default:
        return null;
    }
  };

  return (
    <div className={`flex h-full transition-all duration-300 ease-in-out bg-white shadow-sm`}>
      <div className="w-16 bg-gray-50 text-white flex flex-col items-center py-4 space-y-3 border-r border-gray-200 flex-shrink-0">
        <button
          onClick={() => togglePanel('projects')}
          title="Projekte/Dateien"
          className={`p-2 rounded-lg transition-colors ${activeView === 'projects' && isPanelOpen ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-blue-600 hover:bg-blue-100'}`}
        > <Files size={22} /> </button>
        <button
          onClick={() => togglePanel('outline')}
          title="Gliederung"
          className={`p-2 rounded-lg transition-colors ${activeView === 'outline' && isPanelOpen ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-blue-600 hover:bg-blue-100'}`}
        > <ListTree size={22} /> </button>
        <button
          onClick={() => togglePanel('sources')}
          title="Quellen"
          className={`p-2 rounded-lg transition-colors ${activeView === 'sources' && isPanelOpen ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-blue-600 hover:bg-blue-100'}`}
        > <BookOpen size={22} /> </button>
        <div className="mt-auto space-y-3">
            <button title="Suche" className="p-2 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-blue-100 transition-colors"><Search size={20}/></button>
            <button title="Einstellungen" className="p-2 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-blue-100 transition-colors"><Settings size={20}/></button>
        </div>
      </div>

      <div
        className={`transition-all duration-300 ease-in-out overflow-hidden ${
          isPanelOpen ? 'w-80 border-r border-gray-200' : 'w-0' // Breite angepasst
        } bg-gray-50 h-full flex flex-col`}
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