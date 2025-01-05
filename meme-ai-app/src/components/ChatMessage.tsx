import React, { useMemo } from 'react';

interface ChatMessageProps {
  message: string;
}

// Function to generate a consistent color for a sender
const generateSenderColor = (sender: string): string => {
  let hash = 0;
  for (let i = 0; i < sender.length; i++) {
    hash = sender.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = hash % 360;
  return `hsl(${hue}, 70%, 35%)`; // Using HSL for better control over brightness
};

export const ChatMessage: React.FC<ChatMessageProps> = ({ message = '' }) => {
  if (!message) return null;
  
  // Split into individual messages by newline
  const messages = message.split('\n').filter(msg => msg.trim());
  
  return (
    <div className="chat-messages">
      {messages.map((msg, index) => {
        // Extract sender and content
        const colonIndex = msg.indexOf(': ');
        if (colonIndex === -1) return null;
        
        const senderPart = msg.substring(0, colonIndex);
        const content = msg.substring(colonIndex + 2);
        
        // Extract sender name from [timestamp] sender format
        const senderMatch = senderPart.match(/\[.*?\] (.*)/);
        if (!senderMatch) return null;
        
        const sender = senderMatch[1];
        const senderColor = generateSenderColor(sender);
        
        return (
          <div key={index} className="chat-message received">
            <div className="chat-message-sender" style={{ color: senderColor }}>{sender}</div>
            <div className="chat-message-content">
              {content.trim()}
            </div>
          </div>
        );
      })}
    </div>
  );
}; 