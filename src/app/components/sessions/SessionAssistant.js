"use client";

import { useState, useRef, useEffect } from "react";
import { PaperAirplaneIcon, ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/24/outline";

export default function SessionAssistant({ sessionId, clientId }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(true);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      // Build conversation context from recent messages (last 10 messages)
      const recentMessages = messages.slice(-10);
      const context = recentMessages.map((msg) => `${msg.role}: ${msg.content}`).join("\n");

      const response = await fetch(`/api/sessions/${sessionId}/ai-assist`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: userMessage,
          context: context,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get AI response");
      }

      const data = await response.json();
      setMessages((prev) => [...prev, { role: "assistant", content: data.response }]);
    } catch (error) {
      console.error("Error:", error);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, I encountered an error. Please try again." },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className={`fixed bottom-4 right-4 transition-all duration-300 ${
        isMinimized
          ? "w-14 h-14 bg-blue-500 rounded-full shadow-lg"
          : "w-[600px] h-[600px] bg-white rounded-lg shadow-lg border border-gray-200"
      }`}
    >
      <div
        className={`${
          isMinimized
            ? "h-full flex items-center justify-center"
            : "p-4 border-b border-gray-200 flex justify-between items-center"
        }`}
      >
        {isMinimized ? (
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-2 hover:bg-blue-600 rounded-full"
          >
            <ChevronUpIcon className="h-6 w-6 text-white" />
          </button>
        ) : (
          <>
            <h3 className="text-lg font-medium">TheraBot</h3>
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-1 hover:bg-gray-100 rounded-full"
            >
              <ChevronDownIcon className="h-5 w-5 text-gray-500" />
            </button>
          </>
        )}
      </div>

      {!isMinimized && (
        <>
          <div className="h-[450px] overflow-y-auto p-4 space-y-6">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-lg px-4 py-3 ${
                    message.role === "user"
                      ? "bg-blue-500 text-white rounded-br-none"
                      : "bg-gray-50 text-gray-800 rounded-bl-none border border-gray-200"
                  }`}
                >
                  <div className="prose prose-sm max-w-none">
                    {message.content.split("\n").map((line, i) => (
                      <p key={i} className="mb-2 last:mb-0">
                        {line}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="max-w-[85%] rounded-lg px-4 py-3 bg-gray-50 text-gray-800 rounded-bl-none border border-gray-200">
                  <div className="flex space-x-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200">
            <div className="flex">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about the session..."
                className="flex-1 border border-gray-300 rounded-l-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="bg-blue-500 text-white rounded-r-lg px-4 py-2 hover:bg-blue-600 disabled:bg-blue-300"
              >
                <PaperAirplaneIcon className="h-5 w-5" />
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}
