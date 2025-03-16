"use client";
import { useState } from "react";
import ChatInput from "../components/chatInput";
import ChatOutput from "../components/chatOutput";
import { sendMessageToLLM } from "@/services/llmService";

export default function ChatPage() {
    const [messages, setMessages] = useState<string[]>([]);

    const handleSendMessage = async (userInput: string) => {
        try {
            const response = await sendMessageToLLM(userInput);  // Antwort vom Backend abrufen
            setMessages((prevMessages) => [
                ...prevMessages,
                `👤 ${userInput}`, 
                `🤖 ${response}`  // Hier muss die KI-Antwort reinkommen!
            ]);
        } catch (error) {
            console.error("Fehler beim Abrufen der Antwort:", error);
        }
    };

    return (
        <div className="max-w-2xl mx-auto p-4">
            <h1 className="text-2xl font-bold mb-4">Hausarbeit Agent Chat</h1>
            <ChatOutput messages={messages} />
            <ChatInput onSend={handleSendMessage} />
        </div>
    );
}
