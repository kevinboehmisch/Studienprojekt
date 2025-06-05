// src/components/sidemenu/SideMenu.tsx
"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Files,
  ListTree,
  BookOpen,
  Plus,
  Search,
  Settings,
  X,
  ChevronDown,
  ChevronRight as ChevronRightIcon,
  Edit2,
  Trash2,
} from "lucide-react";
// Importiere Typen und Funktionen direkt aus outlineUtils
import {
  OutlineItem,
  NumberedOutlineItem,
  generateNumberedDisplayOutline,
  addOutlineItemRecursively,
  updateOutlineItemTitleRecursively,
  deleteOutlineItemRecursively,
} from "../../utils/outlineUtils"; // Pfad prüfen und ggf. anpassen

import SourcesPanel from "./SourcesPanel"; // Importiere das SourcesPanel
import Link from "next/link"; // <--- hinzufügen
// Typen für die Daten (vereinfacht für das Beispiel)
interface ProjectFile {
  id: string;
  name: string;
  lastModified: string;
  active?: boolean;
}

type ActivePanelView = "projects" | "outline" | "sources" | null;

interface SideMenuProps {
  outline: OutlineItem[];
  onOutlineChange?: (outline: OutlineItem[]) => void;
  onOutlineItemClick?: (item: OutlineItem) => void;
}

const SideMenu: React.FC<SideMenuProps> = ({
  outline,
  onOutlineChange,
  onOutlineItemClick,
}) => {
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [activeView, setActiveView] = useState<ActivePanelView>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [outlineTitle, setOutlineTitle] = useState<string>("");

  // Projekte aus localStorage laden (als Array)
  const [projects, setProjects] = useState<{ id: string; title: string }[]>([]);

  // Hilfsfunktion: Projekte aus localStorage laden
  const loadProjects = () => {
    if (typeof window !== "undefined") {
      const savedProjects = localStorage.getItem("projects");
      if (savedProjects) {
        try {
          const parsed = JSON.parse(savedProjects);
          // Filtere leere oder fehlerhafte Projekte raus
          if (Array.isArray(parsed)) {
            setProjects(parsed.filter((p) => p && p.id && p.title));
          } else {
            setProjects([]);
          }
        } catch (e) {
          setProjects([]);
        }
      } else {
        setProjects([]);
      }
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedConfig = localStorage.getItem("documentConfig");
      if (savedConfig) {
        try {
          const config = JSON.parse(savedConfig);
          if (config.outlineTitle) setOutlineTitle(config.outlineTitle);
        } catch (e) {}
      }
      // Beispiel: Projekte aus localStorage laden (hier als Array von Projekten erwartet)
      loadProjects();
    }
  }, [outlineTitle]);

  // Projekte nach Hinzufügen neu laden, wenn das Panel geöffnet wird
  useEffect(() => {
    // Lade Projekte immer beim Öffnen des Panels neu
    if (isPanelOpen && activeView === "projects") {
      loadProjects();
    }
  }, [isPanelOpen, activeView]);

  const displayOutline = useMemo(() => {
    return generateNumberedDisplayOutline(outline);
  }, [outline]);

  useEffect(() => {
    const mainChapters = outline
      .filter((item) => item.level === 1)
      .map((item) => item.id);
    if (mainChapters.length > 0 && expandedItems.size === 0) {
      // Nur initial setzen, wenn noch nichts expanded ist
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
      const newOutline = updateOutlineItemTitleRecursively(
        outline,
        editingId,
        editingText
      );
      onOutlineChange(newOutline);
    }
    setEditingId(null);
    setEditingText("");
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
              {isExpanded ? (
                <ChevronDown size={14} />
              ) : (
                <ChevronRightIcon size={14} />
              )}
            </button>
          )}
          {!hasChildren && <span className="mr-1 w-[18px] flex-shrink-0" />}

          {isEditing ? (
            <input
              type="text"
              value={editingText}
              onChange={(e) => setEditingText(e.target.value)}
              onBlur={saveEdit}
              onKeyPress={(e) => {
                if (e.key === "Enter") saveEdit();
                if (e.key === "Escape") {
                  setEditingId(null);
                  setEditingText("");
                }
              }}
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
                  onClick={(e) => {
                    e.stopPropagation();
                    startEditing(item);
                  }}
                  className="p-1 hover:bg-gray-200 rounded"
                  title="Bearbeiten"
                >
                  {" "}
                  <Edit2 size={14} />{" "}
                </button>
                {item.level < 3 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      addNewItem(item.id);
                    }}
                    className="p-1 hover:bg-gray-200 rounded"
                    title="Unterkapitel hinzufügen"
                  >
                    {" "}
                    <Plus size={14} />{" "}
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteItem(item.id);
                  }}
                  className="p-1 hover:bg-red-100 text-red-600 rounded"
                  title="Löschen"
                >
                  {" "}
                  <Trash2 size={14} />{" "}
                </button>
              </div>
            </>
          )}
        </div>
        {hasChildren && isExpanded && (
          <div>
            {item.children!.map((child) =>
              renderOutlineItem(child as NumberedOutlineItem, depth + 1)
            )}
          </div>
        )}
      </div>
    );
  };

  // Projekt löschen
  const handleDeleteProject = (projectId: string) => {
    if (typeof window !== "undefined") {
      const savedProjects = localStorage.getItem("projects");
      if (savedProjects) {
        try {
          let parsed = JSON.parse(savedProjects);
          if (Array.isArray(parsed)) {
            parsed = parsed.filter((p: any) => p.id !== projectId);
            localStorage.setItem("projects", JSON.stringify(parsed));
            setProjects(parsed);
            // Optional: Wenn das gelöschte Projekt das aktuelle ist, documentConfig zurücksetzen
            const currentConfig = localStorage.getItem("documentConfig");
            if (currentConfig) {
              try {
                const configObj = JSON.parse(currentConfig);
                if (
                  configObj.projectName &&
                  projects.find(
                    (p) => p.id === projectId && p.title === configObj.projectName
                  )
                ) {
                  localStorage.removeItem("documentConfig");
                }
              } catch {}
            }
          }
        } catch {}
      }
    }
  };

  // Projekt als aktiv setzen und zugehörige Daten laden
  const handleSelectProject = (proj: { id: string; title: string }) => {
    if (typeof window !== "undefined") {
      // Lade alle Projekte aus localStorage
      const allProjectsRaw = localStorage.getItem("projects");
      let allProjects = [];
      if (allProjectsRaw) {
        try {
          allProjects = JSON.parse(allProjectsRaw);
        } catch {}
      }
      // Hole das aktuelle Projekt
      const currentProject = allProjects.find((p: any) => p.id === proj.id);

      // Lade die zugehörige Konfiguration für dieses Projekt
      const projectConfigRaw = localStorage.getItem(`documentConfig_${proj.id}`);
      let projectConfig = {};
      if (projectConfigRaw) {
        try {
          projectConfig = JSON.parse(projectConfigRaw);
        } catch {}
      }

      // Setze das aktuelle Projekt als aktives documentConfig
      localStorage.setItem(
        "documentConfig",
        JSON.stringify({
          ...projectConfig,
          projectName: proj.title,
          projectId: proj.id,
        })
      );
      window.location.href = "/chat";
    }
  };

  const renderPanelContent = () => {
    switch (activeView) {
      case "projects":
        return (
          <div className="p-3 space-y-2">
            <div className="mb-2 px-2 py-1 rounded bg-blue-50 border border-blue-100 text-blue-800 text-xs font-semibold">
              Meine Projekte
            </div>
            <div className="flex flex-col gap-1">
              {projects.length === 0 && (
                <div className="text-gray-400 text-sm px-2 py-4 text-center">
                  Keine Projekte gefunden.
                </div>
              )}
              {projects.map((proj) => (
                <div key={proj.id} className="flex items-center group">
                  <button
                    className="flex-1 block text-left px-3 py-2 rounded-md hover:bg-blue-100 text-gray-800 font-medium transition-colors truncate cursor-pointer"
                    title={proj.title}
                    style={{ cursor: "pointer" }}
                    onClick={() => handleSelectProject(proj)}
                  >
                    {proj.title}
                  </button>
                  <button
                    className="ml-2 p-1 rounded hover:bg-red-100 text-red-600 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    title="Projekt löschen"
                    style={{ cursor: "pointer" }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteProject(proj.id);
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
            <Link href="/setup">
              <button className="w-full mt-4 flex items-center justify-center py-2 px-3 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors">
                <Plus size={16} className="mr-1.5" /> Neues Projekt
              </button>
            </Link>
          </div>
        );
      case "outline":
        return (
          <div className="p-3">
            {outline.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <ListTree size={24} className="mx-auto mb-2 text-gray-400" />
                <p>Keine Gliederung vorhanden.</p>
                <p className="text-xs mt-1">
                  Die Gliederung kann im Editor oder hier bearbeitet werden.
                </p>
              </div>
            ) : (
              <div className="space-y-0.5">
                {displayOutline.map((item) => renderOutlineItem(item))}
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
      case "sources":
        // HIER WIRD DIE NEUE KOMPONENTE EINGEFÜGT
        return <SourcesPanel />;
      default:
        return null;
    }
  };

  return (
    <div
      className={`flex h-full transition-all duration-300 ease-in-out bg-white shadow-sm`}
    >
      <div className="w-16 bg-gray-50 text-white flex flex-col items-center py-4 space-y-3 border-r border-gray-200 flex-shrink-0">
        <button
          onClick={() => togglePanel("projects")}
          title="Projekte/Dateien"
          className={`p-2 rounded-lg transition-colors ${
            activeView === "projects" && isPanelOpen
              ? "bg-blue-600 text-white"
              : "text-gray-500 hover:text-blue-600 hover:bg-blue-100"
          }`}
        >
          {" "}
          <Files size={22} />{" "}
        </button>
        <button
          onClick={() => togglePanel("outline")}
          title="Gliederung"
          className={`p-2 rounded-lg transition-colors ${
            activeView === "outline" && isPanelOpen
              ? "bg-blue-600 text-white"
              : "text-gray-500 hover:text-blue-600 hover:bg-blue-100"
          }`}
        >
          {" "}
          <ListTree size={22} />{" "}
        </button>
        <button
          onClick={() => togglePanel("sources")}
          title="Quellen"
          className={`p-2 rounded-lg transition-colors ${
            activeView === "sources" && isPanelOpen
              ? "bg-blue-600 text-white"
              : "text-gray-500 hover:text-blue-600 hover:bg-blue-100"
          }`}
        >
          {" "}
          <BookOpen size={22} />{" "}
        </button>
        <div className="mt-auto space-y-3">
          <button
            title="Suche"
            className="p-2 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-blue-100 transition-colors"
          >
            <Search size={20} />
          </button>
          <button
            title="Einstellungen"
            className="p-2 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-blue-100 transition-colors"
          >
            <Settings size={20} />
          </button>
        </div>
      </div>

      <div
        className={`transition-all duration-300 ease-in-out overflow-hidden ${
          isPanelOpen ? "w-80 border-r border-gray-200" : "w-0" // Breite angepasst
        } bg-gray-50 h-full flex flex-col`}
      >
        {isPanelOpen && (
          <>
            <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-white">
              <h2 className="text-md font-semibold text-gray-700">
                {activeView === "projects" && "Projektdateien"}
                {activeView === "outline" && "Gliederung"}
                {activeView === "sources" && "Quellenübersicht"}
              </h2>
              <button
                onClick={closePanel}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-md"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-grow overflow-y-auto">{renderPanelContent()}</div>
          </>
        )}
      </div>
    </div>
  );
};

export default SideMenu;
