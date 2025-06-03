// src/app/chat/page.tsx
"use client";
import ChatInterface from "../../components/ChatInterface";
import Tiptap from "../../components/Tiptap";

export default function ChatPage() {
  return (
    <div className="flex h-screen">
      {/* Tiptap Editor als Hauptelement */}
      <div className="flex-grow p-4 bg-gray-50">
        <div className="bg-white rounded-lg shadow h-full p-2">
          <Tiptap />
        </div>
      </div>
      
      {/* Chat Interface als Sidebar */}
      <div className="w-80 border-l">
        <ChatInterface asSidebar={true} />
      </div>
    </div>
  );
}