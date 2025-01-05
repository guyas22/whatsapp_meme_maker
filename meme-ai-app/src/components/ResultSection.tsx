import React from 'react';
import { ChatMessage } from './ChatMessage';

interface ResultSectionProps {
  currentStep: number;
  generatedMeme: string | null;
  templateExplanation: string | null;
  templateFormat: string | null;
  isExplanationVisible: boolean;
  setIsExplanationVisible: (visible: boolean) => void;
  contextChunks: Array<{ content: string; metadata: any }>;
  handleDownloadMeme: () => void;
  handleShareMeme: () => void;
}

export const ResultSection: React.FC<ResultSectionProps> = ({
  currentStep,
  generatedMeme,
  templateExplanation,
  templateFormat,
  isExplanationVisible,
  setIsExplanationVisible,
  contextChunks,
  handleDownloadMeme,
  handleShareMeme,
}) => {
  if (!generatedMeme) return null;

  return (
    <section className={`result-section ${currentStep === 3 ? 'active-step' : ''}`}>
      <div className="result-container">
        <div className="meme-display">
          <h3>Your Generated Meme</h3>
          <div className="meme-preview">
            <img src={generatedMeme} alt="Generated Meme" />
            <div className="meme-actions">
              <button 
                className="download-button"
                onClick={handleDownloadMeme}
              >
                Download Meme ⬇️
              </button>
              <button 
                className="share-button"
                onClick={handleShareMeme}
              >
                Share Meme 🔗
              </button>
            </div>
          </div>

          {(templateExplanation || templateFormat) && (
            <div className="meme-explanation">
              <button 
                className="explanation-toggle"
                onClick={() => setIsExplanationVisible(!isExplanationVisible)}
              >
                {isExplanationVisible ? '🔼 Hide AI Explanation' : '🔽 Show AI Explanation'}
              </button>
              {isExplanationVisible && (
                <div className="explanation-content">
                  <h4>About this Meme</h4>
                  {templateExplanation && (
                    <div className="explanation">
                      <strong>Why this template:</strong> {templateExplanation}
                    </div>
                  )}
                  {templateFormat && (
                    <div className="format">
                      <strong>Template format:</strong> {templateFormat}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="context-display">
          <h3>Chat Context Used</h3>
          <div className="chat-container">
            {contextChunks.map((chunk, index) => (
              <div key={index} className="conversation-chunk">
                <h4>Conversation {index + 1}</h4>
                <ChatMessage message={chunk.content} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}; 