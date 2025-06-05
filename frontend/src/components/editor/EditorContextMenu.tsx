// src/components/editor/EditorContextMenu.tsx
'use client'

import React from 'react';
import { Sparkles, Edit3, BookMarked, Scissors, Copy, ClipboardPaste } from 'lucide-react'; // Beispiel-Icons

interface EditorContextMenuProps {
  isVisible: boolean;
  position: { top: number; left: number } | null;
  editor: any; // Tiptap Editor-Instanz für Aktionen
  onClose: () => void;
  // Handler für Aktionen, die du im Menü anbieten willst
  onGenerateText: (prompt?: string) => void; // Kann optional einen Prompt annehmen
  onRewriteText: (prompt?: string) => void;  // Muss hier definiert sein
  onFindSources: () => void;              // Für "Quellen suchen"
  // Füge hier weitere Standard-Kontextmenü-Aktionen hinzu, falls gewünscht
}

const EditorContextMenu: React.FC<EditorContextMenuProps> = ({
  isVisible,
  position,
  editor,
  onClose,
  onGenerateText,
  onRewriteText,
  onFindSources,
}) => {
  if (!isVisible || !position || !editor) {
    return null;
  }

  const handleAction = (action: () => void) => {
    action();
    onClose(); // Menü nach Aktion schließen
  };

  const canRewrite = !editor.state.selection.empty;
  const canFindSources = !editor.state.selection.empty;
  // const canPaste = navigator.clipboard && typeof navigator.clipboard.readText === 'function'; // Basis-Check für Paste

  return (
    <div
      className="fixed bg-white rounded-md shadow-xl border border-gray-200 p-1 z-50 min-w-[200px] text-sm animate-fadeIn" // animate-fadeIn von vorher
      style={{ top: position.top, left: position.left }}
      onContextMenu={(e) => e.preventDefault()} // Verhindere weiteres Kontextmenü im Menü selbst
    >
      <ul className="space-y-0.5">
        {/* KI-Aktionen */}
        <li>
          <button
            onClick={() => handleAction(() => onGenerateText())} // Standard-Generierung ohne Prompt
            className="w-full flex items-center px-3 py-1.5 text-gray-700 hover:bg-green-50 hover:text-green-700 rounded-md"
          >
            <Sparkles size={16} className="mr-2 text-green-600" />
            Textabschnitt generieren
          </button>
        </li>
        {/* Optional: Generieren mit Anweisung (würde InlinePrompt im ContextMenu benötigen oder ein Modal öffnen) */}
        {/* <li><button className="w-full ...">Generieren mit Anweisung...</button></li> */}

        {canRewrite && ( // Nur anzeigen, wenn Text markiert ist
          <li>
            <button
              onClick={() => handleAction(() => onRewriteText())} // Standard-Umschreibung
              className="w-full flex items-center px-3 py-1.5 text-gray-700 hover:bg-purple-50 hover:text-purple-700 rounded-md"
            >
              <Edit3 size={16} className="mr-2 text-purple-600" />
              Text umschreiben
            </button>
          </li>
        )}
         {canFindSources && ( // Nur anzeigen, wenn Text markiert ist
          <li>
            <button
              onClick={() => handleAction(onFindSources)}
              className="w-full flex items-center px-3 py-1.5 text-gray-700 hover:bg-blue-50 hover:text-blue-700 rounded-md"
            >
              <BookMarked size={16} className="mr-2 text-blue-600" />
              Passende Quellen suchen
            </button>
          </li>
        )}

        {/* Standard-Editor-Aktionen (Beispiele) */}
        {(canRewrite || !editor.state.selection.empty) && <hr className="my-1 border-gray-200" />}

        {!editor.state.selection.empty && (
            <li>
            <button
                onClick={() => handleAction(() => editor.chain().focus().run() /* TODO: editor.commands.cut() ist nicht Standard */ )}
                className="w-full flex items-center px-3 py-1.5 text-gray-700 hover:bg-gray-100 rounded-md"
                disabled // Tiptap hat kein eingebautes "cut". Müsste man manuell implementieren (copy + delete)
            >
                <Scissors size={16} className="mr-2" /> Ausschneiden (TODO)
            </button>
            </li>
        )}
        {!editor.state.selection.empty && (
            <li>
            <button
                onClick={() => handleAction(() => editor.chain().focus().run() /* TODO: editor.commands.copy() */ )}
                className="w-full flex items-center px-3 py-1.5 text-gray-700 hover:bg-gray-100 rounded-md"
                disabled // Tiptap hat kein eingebautes "copy". Müsste man manuell implementieren.
            >
                <Copy size={16} className="mr-2" /> Kopieren (TODO)
            </button>
            </li>
        )}
        {/* <li>
          <button
            onClick={() => handleAction(() => editor.chain().focus().paste().run())} // Tiptap hat kein .paste() Command
            className="w-full flex items-center px-3 py-1.5 text-gray-700 hover:bg-gray-100 rounded-md"
            // disabled={!canPaste} // Müsste man prüfen, ob Einfügen möglich ist
          >
            <ClipboardPaste size={16} className="mr-2" /> Einfügen (TODO)
          </button>
        </li> */}
      </ul>
    </div>
  );
};

export default EditorContextMenu;