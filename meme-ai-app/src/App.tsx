import { useState } from 'react'
import './App.css'

const API_BASE_URL = 'http://127.0.0.1:5000/api'

function App() {
  const [file, setFile] = useState<File | null>(null)
  const [isProcessed, setIsProcessed] = useState(false)
  const [memePrompt, setMemePrompt] = useState('')
  const [generatedMeme, setGeneratedMeme] = useState<string | null>(null)
  const [contextChunks, setContextChunks] = useState<Array<{ content: string, metadata: any }>>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
      const response = await fetch(`${API_BASE_URL}/ingest-chat`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error(`Error processing chat: ${response.statusText}`)
      }

      const data = await response.json()
      setIsProcessed(true)
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
      const response = await fetch(`${API_BASE_URL}/generate-meme`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: memePrompt }),
      })

      if (!response.ok) {
        throw new Error(`Error generating meme: ${response.statusText}`)
      }

      const data = await response.json()
      console.log('Response data:', data)
      
      // Convert hex image data back to blob
      const imageData = data.image_data
      console.log('Image data length:', imageData?.length)
      
      if (!imageData) {
        throw new Error('No image data received from server')
      }

      const byteArray = new Uint8Array(imageData.match(/.{1,2}/g).map((byte: string) => parseInt(byte, 16)))
      const blob = new Blob([byteArray], { type: 'image/jpeg' })
      const imageUrl = URL.createObjectURL(blob)
      
      console.log('Context chunks:', data.context_chunks)
      setGeneratedMeme(imageUrl)
      setContextChunks(data.context_chunks.map((chunk: any) => ({
        content: chunk[0],
        metadata: chunk[1]
      })))
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
    // Split the message into individual chat messages
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

  return (
    <div className="app-container">
      <header>
        <h1>🎭 WhatsApp Meme Generator</h1>
      </header>

      <main>
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <section className="upload-section">
          <h2>1. Upload Chat File</h2>
          <div className="upload-container">
            <input
              type="file"
              accept=".txt,.zip"
              onChange={handleFileUpload}
              className="file-input"
              disabled={isLoading}
            />
            {file && (
              <button 
                onClick={handleProcessChat}
                className="process-button"
                disabled={isLoading}
              >
                {isLoading ? 'Processing...' : 'Process Chat'}
              </button>
            )}
          </div>
        </section>

        {isProcessed && (
          <section className="meme-section">
            <h2>2. Generate Meme</h2>
            <div className="example-prompts">
              <h3>Example prompts:</h3>
              <ul>
                <li>תעשה מם על זה שדני תמיד מאחר</li>
                <li>ת��שה מם על הבדיחות של יוסי</li>
                <li>תעשה מם על הפיצות שאנחנו מזמינים</li>
              </ul>
            </div>

            <div className="meme-input">
              <input
                type="text"
                value={memePrompt}
                onChange={(e) => setMemePrompt(e.target.value)}
                placeholder="Enter your meme prompt (in Hebrew)"
                dir="rtl"
                disabled={isLoading}
              />
              <button 
                onClick={handleGenerateMeme}
                disabled={!memePrompt || isLoading}
              >
                {isLoading ? 'Generating...' : 'Generate Meme'}
              </button>
            </div>

            {generatedMeme && (
              <div className="result-container">
                <div className="meme-display">
                  <h3>Generated Meme</h3>
                  <img src={generatedMeme} alt="Generated Meme" />
                  <button 
                    className="download-button"
                    onClick={handleDownloadMeme}
                  >
                    ⬇️ Download Meme
                  </button>
                </div>

                <div className="context-display">
                  <h3>AI Context Used</h3>
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
            )}
          </section>
        )}
      </main>
    </div>
  )
}

export default App
