import React from 'react';

interface MemeSectionProps {
  currentStep: number;
  isProcessed: boolean;
  groupName: string;
  senders: string[];
  memePrompt: string;
  isLoading: boolean;
  showMentions: boolean;
  mentionFilter: string;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleMentionClick: (sender: string) => void;
  handleGenerateMeme: () => void;
  setMemePrompt: (prompt: string) => void;
}

export const MemeSection: React.FC<MemeSectionProps> = ({
  currentStep,
  isProcessed,
  groupName,
  senders,
  memePrompt,
  isLoading,
  showMentions,
  mentionFilter,
  handleInputChange,
  handleMentionClick,
  handleGenerateMeme,
  setMemePrompt,
}) => {
  return (
    <section className={`meme-section ${currentStep === 2 ? 'active-step' : ''}`}>
      <h2>Create Your Meme</h2>
      {isProcessed && (
        <>
          <div className="chat-info">
            {groupName && (
              <div className="group-name">
                <h3>Group Name:</h3>
                <span className="group-name-text">{groupName}</span>
              </div>
            )}
            <div className="chat-participants">
              <h3>Chat Participants:</h3>
              <div className="participants-list">
                {senders.map((sender, index) => (
                  <span key={index} className="participant-chip">
                    {sender}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="example-prompts">
            <h3>Need inspiration? Try these:</h3>
            <div className="prompt-suggestions">
              <button 
                className="suggestion-chip"
                onClick={() => setMemePrompt(`תעשה מם על הבדיחות של ${senders[Math.floor(Math.random() * senders.length)]} `)}
              >
                🤣 מם על בדיחות של אחד מחברי הקבוצה
              </button>
              <button 
                className="suggestion-chip"
                onClick={() => setMemePrompt(`תעשה מם על האיחורים של ${senders[Math.floor(Math.random() * senders.length)]}`)}
              >
                ⏰ מם על האיחורים של אחד מחברי הקבוצה 
              </button>
              <button 
                className="suggestion-chip"
                onClick={() => setMemePrompt(`תעשה מם על האוכל של ${senders[Math.floor(Math.random() * senders.length)]}`)}
              >
                🍔 מם על האוכל שאחד מחברי הקבוצה מכין
              </button>
            </div>
          </div>

          <div className="meme-input">
            <div className="input-container">
              <input
                type="text"
                value={memePrompt}
                onChange={handleInputChange}
                placeholder="תאר את המם שאתה רוצה ליצור... (השתמש ב-@ כדי לתייג חבר)"
                dir="rtl"
                disabled={isLoading}
              />
              {showMentions && (
                <div className="mentions-dropdown">
                  {senders
                    .filter(sender => 
                      sender.toLowerCase().includes(mentionFilter)
                    )
                    .map((sender, index) => (
                      <div
                        key={index}
                        className="mention-item"
                        onClick={() => handleMentionClick(sender)}
                      >
                        {sender}
                      </div>
                    ))
                  }
                </div>
              )}
            </div>
            <button 
              onClick={handleGenerateMeme}
              disabled={!memePrompt || isLoading}
              className="generate-button"
            >
              {isLoading ? (
                <span className="loading-spinner">🔄</span>
              ) : (
                'Generate Meme 🎨'
              )}
            </button>
          </div>
        </>
      )}
    </section>
  );
}; 