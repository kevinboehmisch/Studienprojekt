interface ChatOutputProps {
  messages: string[];
}

export default function ChatOutput({ messages }: ChatOutputProps) {
  return (
    <div className="p-4 border min-h-[200px] bg-gray-100">
      {messages.length === 0 ? (
        <p className="text-gray-500">Noch keine Antworten...</p>
      ) : (
        messages.map((msg, index) => (
          <p key={index} className="p-2 bg-white rounded-md shadow my-2">
            {msg}
          </p>
        ))
      )}
    </div>
  );
}
