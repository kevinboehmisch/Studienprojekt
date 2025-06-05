// src/components/editor/GenerateTextPromptModal.tsx
"use client";

import React, { useState, useEffect } from "react";

interface GenerateTextPromptModalProps {
  initialPrompt: string;
  onGenerate: (prompt: string) => void;
  onClose: () => void;
  isLoading: boolean;
}

const GenerateTextPromptModal: React.FC<GenerateTextPromptModalProps> = ({
  initialPrompt,
  onGenerate,
  onClose,
  isLoading,
}) => {
  const [prompt, setPrompt] = useState(initialPrompt);

  useEffect(() => {
    setPrompt(initialPrompt); // Stelle sicher, dass der Prompt aktualisiert wird, wenn sich initialPrompt ändert
  }, [initialPrompt]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim()) {
      onGenerate(prompt.trim());
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-lg">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">
          Text generieren
        </h2>
        <form onSubmit={handleSubmit}>
          <p className="text-sm text-gray-600 mb-2">
            Passe die Anweisung an oder gib eine neue ein, um Text basierend auf
            dem Kontext und den Quellen zu generieren:
          </p>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={5}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Z.B. Führe diesen Gedanken fort und erläutere die Implikationen..."
            disabled={isLoading}
          />
          <div className="mt-4 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md disabled:opacity-50"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={isLoading || !prompt.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-white inline"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
              ) : (
                "Generieren"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GenerateTextPromptModal;
