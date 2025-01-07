import React from 'react';
import { STEPS } from '../constants/config';

interface ProgressBarProps {
  currentStep: number;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ currentStep }) => {
  const steps = [
    { number: STEPS.UPLOAD, label: 'Upload Chat' },
    { number: STEPS.GENERATE, label: 'Generate Meme' },
    { number: STEPS.RESULT, label: 'View Result' },
  ];

  const getStepClass = (stepNumber: number) => {
    if (currentStep === STEPS.LIMIT_REACHED) {
      return stepNumber <= STEPS.RESULT ? 'active' : '';
    }
    return stepNumber <= currentStep ? 'active' : '';
  };

  return (
    <div className="progress-bar-container">
      <div className="progress-bar" data-step={currentStep}>
        {steps.map((step) => (
          <div key={step.number} className={`progress-step ${getStepClass(step.number)}`}>
            <div className="step-number">{step.number}</div>
            <div className="step-label">{step.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}; 