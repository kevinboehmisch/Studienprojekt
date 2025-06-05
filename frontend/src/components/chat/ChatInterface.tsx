// src/components/chat/ChatInterface.tsx
"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { sendMessageToLLM } from "../../services/llmService"; // Passe Pfad ggf. an
import ReactMarkdown from 'react-markdown';
import { Send, Loader2, MessageSquare } from 'lucide-react';

type Message = {
  id: string;
  content: string;
  sender: 'user' | 'assistant';
};

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
  const messagesEndRef = useRef<null | HTMLDivElement>(null);
  const textareaRef = useRef<null | HTMLTextAreaElement>(null);
  const [currentInput, setCurrentInput] = useState("");

  useEffect(() => {
    const storedConfig = localStorage.getItem('documentConfig');
    if (storedConfig) {
      const configData = JSON.parse(storedConfig);
      setDocumentConfig(configData);
      const welcomeMessage = `Willkommen zu Ihrem ${configData.documentType}-Projekt! Wie kann ich Ihnen helfen?`;
      setMessages([{ id: `assistant-${Date.now()}`, content: welcomeMessage, sender: 'assistant' }]);
    } else {
      setMessages([{ id: `assistant-${Date.now()}`, content: "Willkommen bei PaperPilot!", sender: 'assistant' }]);
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessageInternal = async (userInput: string) => {
    if (!userInput.trim()) return;
    const newUserMessage: Message = { id: `user-${Date.now()}`, content: userInput, sender: 'user' };
    setMessages(prev => [...prev, newUserMessage]);
    setCurrentInput("");
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    setIsLoading(true);

    try {
      const useRagForThisMessage = true;
      const aiResponseText = await sendMessageToLLM(
          userInput,
          documentConfig,
          useRagForThisMessage,
          3
      );
      const newAssistantMessage: Message = { id: `assistant-${Date.now()}`, content: aiResponseText, sender: 'assistant' };
      setMessages(prev => [...prev, newAssistantMessage]);
    } catch (error) {
      console.error("Fehler in ChatInterface:", error);
      const errorResponseMessage: Message = {
        id: `error-${Date.now()}`,
        content: "Kommunikationsfehler mit dem Assistenten.",
        sender: 'assistant'
      };
      setMessages(prev => [...prev, errorResponseMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  if (asSidebar) {
    return (
      <div className="flex flex-col h-full bg-white text-gray-800 shadow-lg">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <MessageSquare size={20} className="text-gray-600" />
            <h2 className="text-md font-semibold text-gray-700">KI-Assistent</h2>
          </div>
          <p className="text-xs text-gray-500 mt-1 ml-7">
            {documentConfig.documentType} • {documentConfig.citationStyle}
          </p>
        </div>

        {/* Nachrichtenbereich - KEIN extra Padding unten mehr */}
        <div className="flex-grow overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div key={message.id} className={`flex w-full ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`inline-block rounded-xl px-3.5 py-2 max-w-[85%] text-sm shadow-sm
                            ${ message.sender === 'user'
                                ? 'bg-gray-700 text-white rounded-br-lg'
                                : 'bg-gray-100 text-gray-800 rounded-bl-lg'
                            }`}
              >
                {message.sender === 'user' ? (
                  <p className="whitespace-pre-wrap">{message.content}</p>
                ) : (
                  <div className="prose prose-sm max-w-none prose-p:my-1.5 prose-ul:my-1.5 prose-ol:my-1.5 text-gray-800 prose-headings:text-gray-700 prose-strong:font-semibold prose-strong:text-gray-700 prose-a:text-gray-600 prose-a:font-medium hover:prose-a:text-gray-800 prose-a:underline">
                    <ReactMarkdown components={{ a: ({node, ...props}) => <a {...props} target="_blank" rel="noopener noreferrer" /> }}>
                      {message.content}
                    </ReactMarkdown>
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
          {isLoading && !messages.find(m => m.sender === 'assistant' && m.content.includes('denkt nach')) && (
            <div className="flex justify-center items-center py-2">
              <Loader2 size={16} className="text-gray-400 animate-spin mr-2" />
              <p className="text-xs text-gray-500">Assistent denkt nach...</p>
            </div>
          )}
        </div>

        {/* Eingabebereich - nicht mehr absolut positioniert */}
        <div className=" p-4 bg-white"> {/* Hintergrund weiß, um sich vom Chatverlauf abzuheben, falls dieser einen anderen BG hätte */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessageInternal(currentInput);
            }}
            // Der innere Container für das Eingabefeld + Button
            className="flex items-end p-1 bg-gray-100 rounded-2xl shadow-md  relative"
          >
            <textarea
              ref={textareaRef}
              name="message"
              rows={1}
              value={currentInput}
              onChange={(e) => setCurrentInput(e.target.value)}
              className="flex-grow bg-transparent border-none rounded-xl pl-3 pr-12 py-2.5 text-sm text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-0 resize-none overflow-y-hidden no-scrollbar"
              placeholder="Nachricht..."
              autoComplete="off"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessageInternal(currentInput);
                }
              }}
              onInput={(e) => {
                const target = e.currentTarget;
                target.style.height = 'auto';
                const maxHeight = 20 * 4 + 20;
                target.style.height = `${Math.min(target.scrollHeight, maxHeight)}px`;
                target.style.overflowY = target.scrollHeight > maxHeight ? 'auto' : 'hidden';
              }}
            />
            <button // Button bleibt relativ zum Formular-Wrapper positioniert
              type="submit"
              className={`absolute right-2.5 bottom-[9px] w-8 h-8 flex items-center justify-center rounded-full transition-all duration-150
                          ${isLoading || !currentInput.trim()
                            ? 'bg-gray-800 text-white'
                            : 'bg-gray-800 text-white hover:bg-gray-700 active:bg-gray-900'
                          }`}
              disabled={isLoading || !currentInput.trim()}
              title="Senden"
            >
              {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </form>
        </div>
      </div>
    );
  }


  // Original Layout wenn nicht als Sidebar verwendet (unverändert)
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex justify-between h-16 items-center">
            <Link href="/" className="text-xl font-semibold text-black">PaperPilot</Link>
            <button onClick={() => router.push('/setup')} className="text-black hover:text-gray-700">
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
              <div key={message.id || index} className={`mb-4 ${message.sender === 'user' ? 'text-right' : 'text-left'}`}>
                <div className={`inline-block rounded-lg px-4 py-2 max-w-[80%] ${ message.sender === 'user' ? 'bg-blue-100 text-black' : 'bg-gray-100 text-black' }`}>
                  {message.sender === 'user' || message.content.startsWith("Willkommen") || message.content.startsWith("Es ist ein Fehler") ? (
                    message.content
                  ) : (
                    <div className="prose prose-sm max-w-none text-black">
                      <ReactMarkdown>{message.content}</ReactMarkdown>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isLoading && <div className="text-center text-black mt-2">Assistent schreibt...</div>}
            <div ref={messagesEndRef} />
          </div>
          <div className="border-t p-3">
            <form onSubmit={(e) => {
              e.preventDefault();
              const input = e.currentTarget.elements.namedItem('message') as HTMLInputElement;
              //if (input.value.trim()) { handleSendMessage(input.value); input.value = ''; }
            }} className="flex">
              <input type="text" name="message" className="flex-grow border rounded-l px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-black" placeholder="Stellen Sie eine Frage zu Ihrer Arbeit..." />
              <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded-r hover:bg-blue-600" disabled={isLoading}>Senden</button>
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