import { useState } from 'react'
import './App.css'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
console.log('API_BASE_URL:', API_BASE_URL);
console.log('Environment Variables:', import.meta.env);

function App() {
  // State management
  const [currentStep, setCurrentStep] = useState(1)
  const [file, setFile] = useState<File | null>(null)
  const [isProcessed, setIsProcessed] = useState(false)
  const [memePrompt, setMemePrompt] = useState('')
  const [generatedMeme, setGeneratedMeme] = useState<string | null>(null)
  const [contextChunks, setContextChunks] = useState<Array<{ content: string, metadata: any }>>([])
  const [templateExplanation, setTemplateExplanation] = useState<string | null>(null)
  const [templateFormat, setTemplateFormat] = useState<string | null>(null)
  const [isExplanationVisible, setIsExplanationVisible] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [senders, setSenders] = useState<string[]>([])
  const [groupName, setGroupName] = useState<string>('')
  const [showMentions, setShowMentions] = useState(false)
  const [mentionFilter, setMentionFilter] = useState('')
  const [cursorPosition, setCursorPosition] = useState(0)

  // File handling
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    const droppedFile = e.dataTransfer.files?.[0]
    if (droppedFile && (droppedFile.name.endsWith('.txt') || droppedFile.name.endsWith('.zip'))) {
      setFile(droppedFile)
      setError(null)
    } else {
      setError('Please upload a .txt or .zip file')
    }
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = event.target.files?.[0]
    if (uploadedFile) {
      setFile(uploadedFile)
      setError(null)
    }
  }

  const handleProcessChat = async () => {
    if (!file) return

    setIsLoading(true)
    setError(null)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch(`${API_BASE_URL}/api/ingest-chat`, {
        method: 'POST',
        headers: {
          'Origin': 'https://main.d3pwcp73zpm2st.amplifyapp.com',
        },
        body: formData
      })

      if (!response.ok) {
        throw new Error(`Error processing chat: ${response.statusText}`)
      }

      const data = await response.json()
      setIsProcessed(true)
      setSenders(data.senders || [])
      setGroupName(data.group_name || '')
      setCurrentStep(2)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error processing chat file')
    } finally {
      setIsLoading(false)
    }
  }

  const handleGenerateMeme = async () => {
    if (!memePrompt) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`${API_BASE_URL}/api/generate-meme`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Origin': 'https://main.d3pwcp73zpm2st.amplifyapp.com',
        },
        body: JSON.stringify({ query: memePrompt })
      })

      if (!response.ok) {
        throw new Error(`Error generating meme: ${response.statusText}`)
      }

      const data = await response.json()
      
      if (!data.image_data) {
        throw new Error('No image data received from server')
      }

      const byteArray = new Uint8Array(data.image_data.match(/.{1,2}/g).map((byte: string) => parseInt(byte, 16)))
      const blob = new Blob([byteArray], { type: 'image/jpeg' })
      const imageUrl = URL.createObjectURL(blob)
      
      setGeneratedMeme(imageUrl)
      setContextChunks(data.context_chunks.map((chunk: any) => ({
        content: chunk[0],
        metadata: chunk[1]
      })))
      setTemplateExplanation(data.template_explanation || null)
      setTemplateFormat(data.template_format || null)
      setCurrentStep(3)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error generating meme')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDownloadMeme = async () => {
    if (!generatedMeme) return

    const link = document.createElement('a')
    link.href = generatedMeme
    link.download = 'generated-meme.jpg'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const ChatMessage = ({ message }: { message: string }) => {
    const messages = message.split(/\[.*?\] /).filter(msg => msg.trim())
    
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
    )
  }

  const ProgressBar = () => (
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
  )

  // Handle @ mentions
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    const position = e.target.selectionStart || 0
    setMemePrompt(value)
    setCursorPosition(position)

    // Check if we should show mentions
    const lastAtSymbol = value.lastIndexOf('@', position)
    if (lastAtSymbol !== -1 && lastAtSymbol < position) {
      const textAfterAt = value.slice(lastAtSymbol + 1, position)
      setMentionFilter(textAfterAt.toLowerCase())
      setShowMentions(true)
    } else {
      setShowMentions(false)
    }
  }

  const handleMentionClick = (sender: string) => {
    const lastAtSymbol = memePrompt.lastIndexOf('@', cursorPosition)
    if (lastAtSymbol !== -1) {
      const newPrompt = memePrompt.slice(0, lastAtSymbol) + '@' + sender + memePrompt.slice(cursorPosition)
      setMemePrompt(newPrompt)
    }
    setShowMentions(false)
  }

  return (
    <div className="app-container">
      <header>
        <h1>WhatsApp Meme Generator</h1>
        <p className="subtitle">Turn your chat conversations into hilarious memes!</p>
      </header>

      <ProgressBar />

      <main>
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

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
                e.preventDefault()
                e.stopPropagation()
              }
            }}>
              {file ? (
                <>
                  <span className="file-name">{file.name}</span>
                  <button 
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handleProcessChat()
                    }}
                    className="process-button"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Processing...' : 'Start Processing'}
                  </button>
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

        {generatedMeme && (
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
                      onClick={() => {
                        if (navigator.share) {
                          navigator.share({
                            title: 'Check out my meme!',
                            text: 'Generated with WhatsApp Meme Generator',
                            url: generatedMeme
                          })
                        }
                      }}
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
        )}
      </main>
    </div>
  )
}

export default App
