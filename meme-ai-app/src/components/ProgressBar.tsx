import React from 'react';

interface ProgressBarProps {
  currentStep: number;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ currentStep }) => (
  <div className="progress-bar-container">
    <div className="progress-bar" data-step={currentStep}>
      {[1, 2, 3].map((step) => (
        <div 
          key={step} 
          className={`progress-step ${currentStep >= step ? 'active' : ''} ${currentStep === step ? 'current' : ''}`}
        >
          <div className="step-number">{step}</div>
          <div className="step-label">
            {step === 1 ? 'Upload Chat' : step === 2 ? 'Generate Meme' : 'Result'}
          </div>
        </div>
      ))}
    </div>
  </div>
); 