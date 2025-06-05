"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { sendMessageToLLM } from "../../services/llmService";
import ReactMarkdown from "react-markdown";
import ChatInput from "./chatInput";
import { Settings } from "lucide-react";

type Message = {
  content: string;
  sender: "user" | "assistant";
};

interface ChatInterfaceProps {
  asSidebar?: boolean;
}

export default function ChatInterface({
  asSidebar = false,
}: ChatInterfaceProps) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [documentConfig, setDocumentConfig] = useState({
    name: "",
    pageCount: 10,
    citationStyle: "APA",
    documentType: "Bachelor",
    language: "Deutsch",
  });

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const storedConfig = localStorage.getItem("documentConfig");
    if (storedConfig) {
      const configData = JSON.parse(storedConfig);
      setDocumentConfig(configData);
      const welcomeMessage = `Willkommen zu Ihrem ${configData.documentType}-Projekt! Wie kann ich Ihnen helfen?`;
      setMessages([{ content: welcomeMessage, sender: "assistant" }]);
    }
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSendMessage = async (userInput: string) => {
    setMessages((prev) => [...prev, { content: userInput, sender: "user" }]);
    setIsLoading(true);
    try {
      const useRag = false;
      const aiResponseText = await sendMessageToLLM(
        userInput,
        documentConfig,
        useRag,
        3
      );
      setMessages((prev) => [
        ...prev,
        { content: aiResponseText, sender: "assistant" },
      ]);
    } catch (error) {
      console.error("Fehler beim Abrufen der Antwort:", error);
      setMessages((prev) => [
        ...prev,
        {
          content:
            "Es ist ein kritischer Fehler aufgetreten. Bitte versuchen Sie es erneut.",
          sender: "assistant",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const renderMessages = () =>
    messages.map((msg, i) => (
      <div
        key={i}
        className={`flex ${
          msg.sender === "user" ? "justify-end" : "justify-start"
        } mb-2`}
      >
        <div
          className={`flex items-end max-w-[75%] ${
            msg.sender === "user" ? "flex-row-reverse" : ""
          }`}
        >
          <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-sm font-bold text-white mx-2">
            {msg.sender === "user" ? "👤" : "🤖"}
          </div>
          <div
            className={`rounded-2xl px-4 py-2 text-sm shadow ${
              msg.sender === "user"
                ? "bg-blue-500 text-white"
                : "bg-gray-100 text-gray-900 border"
            }`}
          >
            {msg.sender === "user" ? (
              msg.content
            ) : (
              <div className="prose prose-sm max-w-none">
                <ReactMarkdown>{msg.content}</ReactMarkdown>
              </div>
            )}
          </div>
        </div>
      </div>
    ));

  const assistantTyping = isLoading && (
    <div className="flex items-center text-gray-500 text-sm animate-pulse mt-2">
      <span className="mr-2">🤖</span> Assistent schreibt ...
    </div>
  );

  // 🔹🔹🔹 Sidebar-Modus 🔹🔹🔹
  if (asSidebar) {
    return (
      <div className="flex flex-col h-full border-l bg-white">
        {/* Mini-Navigation */}
        <div className="flex justify-between items-center px-3 py-2 border-b bg-white">
          <div
            onClick={() => router.push("/")}
            className="flex items-center cursor-pointer hover:opacity-80 transition"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 mr-1 text-black"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <span className="text-sm font-semibold text-black">PaperPilot</span>
          </div>

          <button
            onClick={() => router.push("/setup")}
            className="text-gray-700 hover:text-blue-600 transition"
            title="Einstellungen"
          >
            <Settings size={18} />
          </button>
        </div>

        {/* Header Info */}
        <div className="bg-gray-50 p-3 border-b">
          <h2 className="text-lg font-semibold text-black">
            {documentConfig.name || "Unbenanntes Projekt"}
          </h2>
          <p className="text-sm text-gray-700">
            {documentConfig.documentType}-Arbeit • {documentConfig.pageCount}{" "}
            Seiten • {documentConfig.citationStyle} • {documentConfig.language}
          </p>
        </div>

        {/* Chatverlauf */}
        <div className="flex-grow overflow-auto p-2">
          {renderMessages()}
          {assistantTyping}
          <div ref={chatEndRef} />
        </div>

        {/* Eingabe */}
        <div className="border-t p-2">
          <ChatInput onSend={handleSendMessage} disabled={isLoading} />
        </div>
      </div>
    );
  }

  // 🔹🔹🔹 Vollbild-Ansicht 🔹🔹🔹
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Haupt-Navigation */}

      <main className="flex-grow flex flex-col max-w-3xl mx-auto w-full p-4">
        <div className="bg-white rounded-lg shadow flex-grow flex flex-col overflow-hidden">
          <div className="bg-gray-50 p-3 border-b">
            <h2 className="font-medium text-black">
              {documentConfig.documentType}-Arbeit
            </h2>
            <p className="text-sm text-gray-700">
              {documentConfig.pageCount} Seiten • {documentConfig.citationStyle}{" "}
              • {documentConfig.language}
            </p>
          </div>

          <div className="flex-grow overflow-auto px-4 py-3 bg-gray-50">
            {renderMessages()}
            {assistantTyping}
            <div ref={chatEndRef} />
          </div>

          <div className="border-t p-3 bg-white">
            <ChatInput onSend={handleSendMessage} disabled={isLoading} />
          </div>
        </div>
      </main>

      <footer className="bg-white border-t py-3 text-center text-sm text-black">
        © 2025 PaperPilot
      </footer>
    </div>
  );
}
