import React from 'react';
import { ChatProcessingIndicator } from './LoadingIndicators';

interface UploadSectionProps {
  currentStep: number;
  file: File | null;
  isLoading: boolean;
  dragActive: boolean;
  handleDrag: (e: React.DragEvent) => void;
  handleDrop: (e: React.DragEvent) => void;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleProcessChat: () => void;
}

export const UploadSection: React.FC<UploadSectionProps> = ({
  currentStep,
  file,
  isLoading,
  dragActive,
  handleDrag,
  handleDrop,
  handleFileUpload,
  handleProcessChat,
}) => {
  return (
    <section className={`upload-section ${currentStep === 1 ? 'active-step' : ''}`}>
      <h2>Upload Your WhatsApp Chat</h2>
      <div 
        className={`drop-zone ${dragActive ? 'drag-active' : ''} ${file ? 'has-file' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          accept=".txt,.zip"
          onChange={handleFileUpload}
          className="file-input"
          disabled={isLoading || !!file}
        />
        <div className="drop-zone-content" onClick={(e) => {
          if (file) {
            e.preventDefault();
            e.stopPropagation();
          }
        }}>
          {file ? (
            <>
              <span className="file-name">{file.name}</span>
              {isLoading ? (
                <ChatProcessingIndicator 
                  message="Processing WhatsApp Chat"
                  subtitle="Analyzing messages and extracting participants... This might take a moment"
                />
              ) : (
                <button 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleProcessChat();
                  }}
                  className="process-button"
                  disabled={isLoading}
                >
                  Start Processing
                </button>
              )}
            </>
          ) : (
            <>
              <div className="upload-icon">📤</div>
              <p>Drag and drop your WhatsApp chat export here or click to browse</p>
              <span className="file-hint">Accepts .txt or .zip files</span>
            </>
          )}
        </div>
      </div>
    </section>
  );
}; 