// src/app/chat/page.tsx
"use client";
import ChatInterface from "../../components/chat/ChatInterface"; // Passe Pfad ggf. an
import Tiptap from "../../components/editor/Tiptap"; // Passe Pfad ggf. an
import SideMenu from "../../components/sidemenu/SideMenu"; // NEU: Importiere dein SideMenu

export default function ChatPage() {
  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {" "}
      {/* overflow-hidden für den Hauptcontainer */}
      {/* Linke Sidebar für Gliederung, Dateien, Quellen */}
      <SideMenu /> {/* Dein neues SideMenu hier einfügen */}
      {/* Mittlerer Bereich: Tiptap Editor */}
      <div className="flex-grow p-4 flex flex-col">
        {" "}
        {/* flex-col, damit Editor Höhe füllt */}
        {/* Optional: Eine Kopfzeile oder Toolbar über dem Editor */}
        {/* <div className="mb-4">
          <h1 className="text-xl font-semibold text-gray-700">Dokumentenbearbeitung</h1>
        </div> */}
        <div className="flex-grow bg-white rounded-lg shadow-md border border-gray-200 p-1">
          {" "}
          {/* p-1 oder p-2 */}
          {/* Tiptap benötigt einen Container, der flexibel wachsen kann, um h-full zu wirken */}
          <Tiptap />
        </div>
      </div>
      {/* Rechte Sidebar: Chat Interface */}
      <div className="w-80 border-l border-gray-200 bg-white shadow-sm flex-shrink-0">
        {" "}
        {/* flex-shrink-0 verhindert Schrumpfen */}
        <ChatInterface asSidebar={true} />
      </div>
    </div>
  );
}
