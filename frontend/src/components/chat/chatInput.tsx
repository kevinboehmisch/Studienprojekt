"use client"; // Damit es in Next.js 13+ im Browser läuft
import { useState } from "react";

interface ChatInputProps {
    onSend: (message: string) => void;
}

export default function ChatInput({ onSend }: ChatInputProps) {
    const [input, setInput] = useState("");

    const handleSend = () => {
        if (input.trim() === "") return;
        onSend(input);
        setInput("");
    };

    return (
        <div className="p-4 flex space-x-2">
            <input
                className="border p-2 flex-grow"
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Gib eine Frage ein..."
            />
            <button 
                onClick={handleSend} 
                className="bg-blue-600 text-white px-4 py-2">
                Senden
            </button>
        </div>
    );
}
