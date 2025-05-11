"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { sendMessageToLLM } from "../services/llmService";
import ReactMarkdown from 'react-markdown';

export default function ChatInterface() {
  const router = useRouter();
  const [messages, setMessages] = useState<string[]>([]);
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
      setMessages([welcomeMessage]);
    }
  }, []);

  const handleSendMessage = async (userInput: string) => {
    setMessages(prev => [...prev, `Sie: ${userInput}`]);
    setIsLoading(true);
    try {
      const response = await sendMessageToLLM(userInput);
      setMessages(prev => [...prev, response]);
    } catch (error) {
      console.error("Fehler beim Abrufen der Antwort:", error);
      setMessages(prev => [...prev, "Es ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut."]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {}
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
              <div key={index} className={`mb-4 ${message.startsWith('Sie:') ? 'text-right' : 'text-left'}`}>
                <div className={`inline-block rounded-lg px-4 py-2 max-w-[80%] ${
                  message.startsWith('Sie:') ? 'bg-blue-100 text-black' : 'bg-gray-100 text-black'
                }`}>
                  {}
                  {message.startsWith('Sie:') || message === `Willkommen zu Ihrem ${documentConfig.documentType}-Projekt! Wie kann ich Ihnen helfen?` || message === "Es ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut." ? (
                    message 
                  ) : (
                    <div className="prose prose-sm max-w-none text-black"> {/* Wende die Klassen hier an */}
                      <ReactMarkdown>
                        {message}
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

          {}
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