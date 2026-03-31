import React, { useState, useRef, useEffect } from "react";
import { generateResponse } from "../services/geminiService";
import "./ChatbotStyles.css";

const Chatbot = () => {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState([]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const suggestions = [
    "Find nearby hospitals",
    "Emergency first aid tips",
    "Medicine availability",
    "Health services near me"
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chat]);

  const sendMessage = async (text = message) => {
    if (!text.trim()) return;

    const userMsg = { sender: "user", text };
    setChat((prev) => [...prev, userMsg]);
    setMessage("");
    setLoading(true);

    try {
      const reply = await generateResponse(text);
      const botMsg = { sender: "bot", text: reply };
      setChat((prev) => [...prev, botMsg]);
    } catch (error) {
      console.error("Error getting response:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* Chat Window */}
      {open && (
        <div className="chatbot-container">
          {/* Header */}
          <div className="chatbot-header">
            <div className="header-content">
              <h3>MediChat Assistant</h3>
              <p>Healthcare support 24/7</p>
            </div>
            <button className="close-btn" onClick={() => setOpen(false)}>
              ✕
            </button>
          </div>

          {/* Chat Messages */}
          <div className="chatbot-messages">
            {chat.length === 0 ? (
              <div className="empty-state">
                <div className="greeting-icon">🏥</div>
                <h4>Hi there! 👋</h4>
                <p>I'm here to help you find hospitals, medicines, and emergency first aid information. What can I assist you with?</p>
              </div>
            ) : (
              chat.map((msg, i) => (
                <div key={i} className={`message-group message-${msg.sender}`}>
                  <div className="message-avatar">
                    {msg.sender === "bot" ? "🏥" : "👤"}
                  </div>
                  <div className={`message-bubble bubble-${msg.sender}`}>
                    {msg.text}
                  </div>
                </div>
              ))
            )}
            {loading && (
              <div className="message-group message-bot">
                <div className="message-avatar">🏥</div>
                <div className="message-bubble bubble-bot loading">
                  <span className="typing-indicator">
                    <span></span><span></span><span></span>
                  </span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Suggestions */}
          {chat.length === 0 && (
            <div className="chatbot-suggestions">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  className="suggestion-btn"
                  onClick={() => sendMessage(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input Area */}
          <div className="chatbot-input-area">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask anything about hospitals, medicine..."
              className="chatbot-input"
              rows="1"
              disabled={loading}
            />
            <button
              onClick={() => sendMessage()}
              className="send-btn"
              disabled={!message.trim() || loading}
            >
              {loading ? "..." : "→"}
            </button>
          </div>
        </div>
      )}

      {/* Floating Button */}
      <button
        onClick={() => setOpen(!open)}
        className="floating-btn"
        title="Open chat"
      >
        <span className="chat-icon">👨‍⚕️</span>
      </button>
    </>
  );
};

export default Chatbot;