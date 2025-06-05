// src/app/chat/page.tsx
"use client";
import { useState, useEffect, useCallback } from "react";
import ChatInterface from "../../components/chat/ChatInterface";
import Tiptap from "../../components/editor/Tiptap";
import SideMenu from "../../components/sidemenu/SideMenu";
import { OutlineItem } from "../../utils/outlineUtils";

export default function ChatPage() {
  const [outline, setOutline] = useState<OutlineItem[]>([]);

  useEffect(() => {
    // Lade das aktuell aktive Projekt
    const savedConfig = localStorage.getItem('documentConfig');
    let config = null;
    if (savedConfig) {
      try {
        config = JSON.parse(savedConfig);
      } catch (e) {}
    }
    // Wenn ein projectId vorhanden ist, lade die spezifische Konfiguration
    if (config && config.projectId) {
      const projectConfigRaw = localStorage.getItem(`documentConfig_${config.projectId}`);
      if (projectConfigRaw) {
        try {
          config = JSON.parse(projectConfigRaw);
        } catch (e) {}
      }
    }
    if (config && config.outline && Array.isArray(config.outline)) {
      setOutline(config.outline);
    } else {
      setOutline([]);
    }
  }, []);

  const updateLocalStorageOutline = (newOutline: OutlineItem[]) => {
    const savedConfigRaw = localStorage.getItem('documentConfig');
    let config = {};
    if (savedConfigRaw) {
      try {
        config = JSON.parse(savedConfigRaw);
      } catch (e) {
        console.error('ChatPage: Fehler beim Parsen von documentConfig aus localStorage beim Speichern:', e);
        // Entscheide, ob du hier mit einem leeren Objekt fortfahren oder abbrechen möchtest
      }
    }
    const updatedConfig = { ...config, outline: newOutline };
    localStorage.setItem('documentConfig', JSON.stringify(updatedConfig));
    console.log("ChatPage: Outline saved to localStorage:", newOutline);
  };

  // Gemeinsamer Handler für Änderungen aus SideMenu und Editor
  const handleOutlineUpdate = useCallback((newOutline: OutlineItem[]) => {
    console.log("ChatPage: handleOutlineUpdate triggered with:", newOutline);
    setOutline(newOutline);
    updateLocalStorageOutline(newOutline);
  }, []);


  const handleOutlineItemClick = useCallback((item: OutlineItem) => {
    // Hier könnte man zum entsprechenden Kapitel im Editor scrollen
    console.log('ChatPage: Gliederungspunkt angeklickt:', item.title, item.id);
    
    if (typeof window !== 'undefined') {
        const headingElement = document.querySelector(`[data-outline-id="${item.id}"]`);
        if (headingElement) {
            headingElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
            console.warn(`ChatPage: Heading mit ID ${item.id} nicht im DOM gefunden.`);
        }
    }
  }, []);

  return (
    <div className="flex h-screen bg-gray-100">
      <div className="flex-shrink-0">
        <SideMenu
          outline={outline}
          onOutlineChange={handleOutlineUpdate} // Verwende gemeinsamen Handler
          onOutlineItemClick={handleOutlineItemClick}
        />
      </div>

      <div className="flex-grow flex flex-col p-4 overflow-hidden">
        <div className="flex-grow bg-white rounded-lg shadow-md border border-gray-200 flex flex-col overflow-hidden"> {/* Geändert zu overflow-hidden, Tiptap selbst scrollt */}
          <Tiptap
            onOutlineUpdate={handleOutlineUpdate} // Verwende gemeinsamen Handler
            initialOutline={outline}
          />
        </div>
      </div>

      <div className="w-96 border-l border-gray-200 bg-white shadow-sm flex-shrink-0 flex flex-col"> {/* Breite Chat-Sidebar ggf. anpassen (war 80) */}
        <ChatInterface asSidebar={true} />
      </div>
    </div>
  );
}