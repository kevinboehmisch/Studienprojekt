// src/components/editor/InlinePromptInput.tsx
'use client'

import React, { useState, useEffect, useRef } from 'react';
import { Loader2, Send, X } from 'lucide-react';

interface InlinePromptInputProps {
  isVisible: boolean;
  initialValue?: string;
  onSubmit: (prompt: string) => void;
  onClose: () => void;
  placeholder?: string;
  isLoading?: boolean;
}

const InlinePromptInput: React.FC<InlinePromptInputProps> = ({
  isVisible,
  initialValue = "",
  onSubmit,
  onClose,
  placeholder = "Optionale Anweisung...",
  isLoading = false,
}) => {
  const [prompt, setPrompt] = useState(initialValue);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setPrompt(initialValue);
  }, [initialValue]);

  useEffect(() => {
    if (isVisible && inputRef.current) {
      inputRef.current.focus();
      // Optional: Text am Ende auswählen, wenn initialValue vorhanden ist
      // inputRef.current.setSelectionRange(inputRef.current.value.length, inputRef.current.value.length);
    }
  }, [isVisible]);

  if (!isVisible) {
    return null;
  }

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (prompt.trim() && !isLoading) {
      onSubmit(prompt.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div className="mt-1 p-2 bg-gray-50 border border-gray-200 rounded-md shadow-sm w-full max-w-xs animate-fadeIn">
      <textarea
        ref={inputRef}
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        onKeyDown={handleKeyDown}
        rows={2}
        className="w-full p-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-transparent resize-none"
        placeholder={placeholder}
        disabled={isLoading}
      />
      <div className="mt-1.5 flex justify-end space-x-2">
        <button
          onClick={onClose}
          type="button"
          className="p-1 text-gray-500 hover:text-gray-700"
          title="Schließen"
          disabled={isLoading}
        >
          <X size={16} />
        </button>
        <button
          onClick={() => handleSubmit()}
          type="button"
          className={`p-1 rounded ${
            !prompt.trim() || isLoading
              ? 'text-gray-400 cursor-not-allowed'
              : 'text-blue-600 hover:text-blue-800'
          }`}
          title="Senden (Enter)"
          disabled={!prompt.trim() || isLoading}
        >
          {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        </button>
      </div>
    </div>
  );
};

export default InlinePromptInput;