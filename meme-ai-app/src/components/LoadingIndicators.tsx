import React from 'react';

interface LoadingDotsProps {
  color?: string;
}

export const LoadingDots: React.FC<LoadingDotsProps> = ({ color = '#25D366' }) => (
  <div className="whatsapp-loading-dots">
    <div className="whatsapp-loading-dot" style={{ backgroundColor: color }} />
    <div className="whatsapp-loading-dot" style={{ backgroundColor: color }} />
    <div className="whatsapp-loading-dot" style={{ backgroundColor: color }} />
  </div>
);

interface ChatProcessingProps {
  message?: string;
  subtitle?: string;
}

export const ChatProcessingIndicator: React.FC<ChatProcessingProps> = ({
  message = "Processing WhatsApp Chat",
  subtitle = "Analyzing messages and participants..."
}) => (
  <div className="processing-chat">
    <div className="processing-icon">📱</div>
    <div className="processing-text">
      <div className="processing-title">{message}</div>
      <div className="processing-subtitle">{subtitle}</div>
    </div>
    <LoadingDots />
  </div>
);

interface MemeGenerationProps {
  message?: string;
}

export const MemeGenerationIndicator: React.FC<MemeGenerationProps> = ({
  message = "Creating your meme..."
}) => (
  <div className="generate-loading">
    <LoadingDots color="#ffffff" />
    <span>{message}</span>
  </div>
); 