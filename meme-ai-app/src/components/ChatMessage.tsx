import React from 'react';

interface ChatMessageProps {
  message: string;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const messages = message.split(/\[.*?\] /).filter(msg => msg.trim());
  
  return (
    <div className="chat-messages">
      {messages.map((msg, index) => (
        <div key={index} className="chat-message received">
          <div className="chat-message-content">
            {msg.trim()}
          </div>
        </div>
      ))}
    </div>
  );
}; 