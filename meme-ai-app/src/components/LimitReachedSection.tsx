import React from 'react';

interface LimitReachedSectionProps {
  isVisible: boolean;
}

export const LimitReachedSection: React.FC<LimitReachedSectionProps> = ({ isVisible }) => {
  if (!isVisible) return null;

  return (
    <section className="limit-reached-section active-step">
      <div className="limit-content">
        <h2>Meme Limit Reached! 🎨</h2>
        <p className="limit-message">
          You've created 5 amazing memes! That's awesome! 🎉
        </p>
        <p className="contact-message">
          Want to create more memes? I'd love to hear from you!
        </p>
        <div className="contact-options">
          <a 
            href="https://www.linkedin.com/in/guy-asulin-b3b1461ba/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="contact-button linkedin"
          >
            <span>Connect on LinkedIn</span>
            <span className="icon">👋</span>
          </a>
          <a 
            href="https://github.com/guyas22/whatsapp_meme_maker" 
            target="_blank" 
            rel="noopener noreferrer"
            className="contact-button github"
          >
            <span>Check out the Code</span>
            <span className="icon">💻</span>
          </a>
         
        </div>
        <div className="fun-fact">
          <p>Fun fact: I built this app while looking for my next software engineering opportunity! 🚀</p>
        </div>
      </div>
    </section>
  );
}; 