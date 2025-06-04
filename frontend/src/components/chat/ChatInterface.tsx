// src/components/ChatInterface.tsx
"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { sendMessageToLLM } from "../../services/llmService";
import ReactMarkdown from 'react-markdown';

// Neuer Typ für Nachrichten
type Message = {
  content: string;
  sender: 'user' | 'assistant';
};

// Neue Props für die Komponente
interface ChatInterfaceProps {
  asSidebar?: boolean;
}

export default function ChatInterface({ asSidebar = false }: ChatInterfaceProps) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [documentConfig, setDocumentConfig] = useState({
    pageCount: 10,
    citationStyle: "APA",
    documentType: "Bachelor",
    language: "Deutsch"
  });

  useEffect(() => {
    const storedConfig = localStorage.getItem('documentConfig');
    if (storedConfig) {
      const configData = JSON.parse(storedConfig);
      setDocumentConfig(configData);
      const welcomeMessage = `Willkommen zu Ihrem ${configData.documentType}-Projekt! Wie kann ich Ihnen helfen?`;
      setMessages([{ content: welcomeMessage, sender: 'assistant' }]);
    }
  }, []);

  const handleSendMessage = async (userInput: string) => {
    setMessages(prev => [...prev, { content: userInput, sender: 'user' }]);
    setIsLoading(true);
    try {
      // HIER entscheidest du, ob RAG verwendet wird.
      // Für deinen Test, dass es ohne RAG funktioniert:
      const useRagForThisMessage = false; 
      // Später kannst du dies basierend auf der Nutzereingabe oder UI-Optionen steuern:
      // const useRagForThisMessage = shouldThisMessageUseRag(userInput); 

      // Rufe die (umbenannte oder neue) Service-Funktion auf
      const aiResponseText = await sendMessageToLLM( // Stellt sicher, dass dies deine korrigierte Funktion ist
          userInput, 
          documentConfig, // documentConfig wird jetzt übergeben
          useRagForThisMessage, // use_rag wird jetzt explizit übergeben
          3 // num_sources, kann auch aus documentConfig oder einem State kommen
      ); 
      
      // Dein ChatInterface erwartet hier nur den Text der AI-Nachricht
      setMessages(prev => [...prev, { content: aiResponseText, sender: 'assistant' }]);

    } catch (error) { // Dieser Catch-Block wird seltener erreicht, wenn sendMessageToLLM Fehler schon fängt
      console.error("Fehler beim Abrufen der Antwort in ChatInterface:", error);
      setMessages(prev => [...prev, { 
        content: "Es ist ein kritischer Fehler aufgetreten. Bitte versuchen Sie es erneut.", 
        sender: 'assistant' 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Die Hauptkomponente wird angepasst, basierend darauf, ob sie als Sidebar verwendet wird
  if (asSidebar) {
    return (
      <div className="flex flex-col h-full">
        <div className="bg-gray-50 p-3 border-b">
          <h2 className="font-medium text-black">Assistent</h2>
          <p className="text-xs text-gray-700">
            {documentConfig.documentType} • {documentConfig.citationStyle}
          </p>
        </div>

        <div className="flex-grow overflow-auto p-2">
          {messages.map((message, index) => (
            <div key={index} className={`mb-2 ${message.sender === 'user' ? 'text-right' : 'text-left'}`}>
              <div className={`inline-block rounded-lg px-3 py-1 max-w-[95%] text-sm ${
                message.sender === 'user' ? 'bg-blue-100 text-black' : 'bg-gray-100 text-black'
              }`}>
                {message.sender === 'user' ? (
                  message.content 
                ) : (
                  <div className="prose prose-sm max-w-none text-black">
                    <ReactMarkdown>
                      {message.content}
                    </ReactMarkdown>
                  </div>
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="text-center text-black text-xs mt-2">
              Assistent schreibt...
            </div>
          )}
        </div>

        <div className="border-t p-2">
          <form onSubmit={(e) => {
            e.preventDefault();
            const input = e.currentTarget.elements.namedItem('message') as HTMLInputElement;
            if (input.value.trim()) {
              handleSendMessage(input.value);
              input.value = '';
            }
          }} className="flex">
            <input
              type="text"
              name="message"
              className="flex-grow border rounded-l px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 text-black"
              placeholder="Frage stellen..."
            />
            <button
              type="submit"
              className="bg-blue-500 text-white px-2 py-1 rounded-r hover:bg-blue-600 text-sm"
              disabled={isLoading}
            >
              →
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Original Layout wenn nicht als Sidebar verwendet
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Rest des originalen Codes bleibt unverändert */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex justify-between h-16 items-center">
            <Link href="/" className="text-xl font-semibold text-black">PaperPilot</Link>
            <button
              onClick={() => router.push('/setup')}
              className="text-black hover:text-gray-700"
            >
              Einstellungen
            </button>
          </div>
        </div>
      </nav>

      <main className="flex-grow flex flex-col max-w-3xl mx-auto w-full p-4">
        <div className="bg-white rounded-lg shadow flex-grow flex flex-col overflow-hidden">
          <div className="bg-gray-50 p-3 border-b">
            <div>
              <h2 className="font-medium text-black">{documentConfig.documentType}-Arbeit</h2>
              <p className="text-sm text-gray-700">
                {documentConfig.pageCount} Seiten • {documentConfig.citationStyle} • {documentConfig.language}
              </p>
            </div>
          </div>

          <div className="flex-grow overflow-auto p-4">
            {messages.map((message, index) => (
              <div key={index} className={`mb-4 ${message.sender === 'user' ? 'text-right' : 'text-left'}`}>
                <div className={`inline-block rounded-lg px-4 py-2 max-w-[80%] ${
                  message.sender === 'user' ? 'bg-blue-100 text-black' : 'bg-gray-100 text-black'
                }`}>
                  {message.sender === 'user' || 
                   message.content === `Willkommen zu Ihrem ${documentConfig.documentType}-Projekt! Wie kann ich Ihnen helfen?` || 
                   message.content === "Es ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut." ? (
                    message.content 
                  ) : (
                    <div className="prose prose-sm max-w-none text-black">
                      <ReactMarkdown>
                        {message.content}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="text-center text-black mt-2">
                Assistent schreibt...
              </div>
            )}
          </div>

          <div className="border-t p-3">
            <form onSubmit={(e) => {
              e.preventDefault();
              const input = e.currentTarget.elements.namedItem('message') as HTMLInputElement;
              if (input.value.trim()) {
                handleSendMessage(input.value);
                input.value = '';
              }
            }} className="flex">
              <input
                type="text"
                name="message"
                className="flex-grow border rounded-l px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                placeholder="Stellen Sie eine Frage zu Ihrer Arbeit..."
              />
              <button
                type="submit"
                className="bg-blue-500 text-white px-4 py-2 rounded-r hover:bg-blue-600"
                disabled={isLoading}
              >
                Senden
              </button>
            </form>
          </div>
        </div>
      </main>

      <footer className="bg-white border-t py-3 text-center text-sm text-black">
        © 2025 PaperPilot
      </footer>
    </div>
  );
}