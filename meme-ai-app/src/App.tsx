import { useState } from 'react'
import './App.css'
import JSZip from 'jszip'
import { ProgressBar } from './components/ProgressBar'
import { UploadSection } from './components/UploadSection'
import { MemeSection } from './components/MemeSection'
import { ResultSection } from './components/ResultSection'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL 

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

  const extractTxtFromZip = async (zipFile: File): Promise<File | null> => {
    try {
      const zip = new JSZip()
      const zipContents = await zip.loadAsync(zipFile)
      
      // Find the first .txt file in the ZIP
      const txtFiles = Object.values(zipContents.files).filter(file => 
        !file.dir && file.name.toLowerCase().endsWith('.txt')
      )
      
      if (txtFiles.length === 0) {
        throw new Error('No .txt file found in the ZIP archive')
      }

      // Extract the content of the first txt file
      const txtFile = txtFiles[0]
      const content = await txtFile.async('blob')
      
      // Create a new File object with the extracted content
      return new File([content], txtFile.name, { type: 'text/plain' })
    } catch (err) {
      console.error('Error extracting txt from zip:', err)
      throw new Error('Failed to extract text file from ZIP')
    }
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    setError(null)
    
    const droppedFile = e.dataTransfer.files?.[0]
    if (!droppedFile) return

    try {
      if (droppedFile.name.endsWith('.zip')) {
        const extractedFile = await extractTxtFromZip(droppedFile)
        if (extractedFile) {
          setFile(extractedFile)
        }
      } else if (droppedFile.name.endsWith('.txt')) {
        setFile(droppedFile)
      } else {
        setError('Please upload a .txt or .zip file')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error processing file')
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = event.target.files?.[0]
    if (!uploadedFile) return
    
    setError(null)
    
    try {
      if (uploadedFile.name.endsWith('.zip')) {
        const extractedFile = await extractTxtFromZip(uploadedFile)
        if (extractedFile) {
          setFile(extractedFile)
        }
      } else if (uploadedFile.name.endsWith('.txt')) {
        setFile(uploadedFile)
      } else {
        setError('Please upload a .txt or .zip file')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error processing file')
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
        body: formData
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || `Error processing chat: ${response.statusText}`);
      }

      const data = await response.json()
      setIsProcessed(true)
      setSenders(data.senders || [])
      setGroupName(data.group_name || '')
      setCurrentStep(2)
    } catch (err) {
      console.error('Process chat error:', err);
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
        },
        body: JSON.stringify({ query: memePrompt })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || `Error generating meme: ${response.statusText}`);
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

  const testConnection = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/ping`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Ping response:', data);
      alert('Connection successful! Server responded with: ' + data.message);
    } catch (error) {
      console.error('Connection test failed:', error);
      alert('Connection failed! Check console for details.');
    }
  }

  return (
    <div className="app-container">
      <header>
        <h1>WhatsApp Meme Generator</h1>
        <p className="subtitle">Turn your chat conversations into hilarious memes!</p>
        <button onClick={testConnection} className="test-connection">
          Test Connection
        </button>
      </header>

      <ProgressBar currentStep={currentStep} />

      <main>
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <UploadSection
          currentStep={currentStep}
          file={file}
          isLoading={isLoading}
          dragActive={dragActive}
          handleDrag={handleDrag}
          handleDrop={handleDrop}
          handleFileUpload={handleFileUpload}
          handleProcessChat={handleProcessChat}
        />

        <MemeSection
          currentStep={currentStep}
          isProcessed={isProcessed}
          groupName={groupName}
          senders={senders}
          memePrompt={memePrompt}
          isLoading={isLoading}
          showMentions={showMentions}
          mentionFilter={mentionFilter}
          handleInputChange={handleInputChange}
          handleMentionClick={handleMentionClick}
          handleGenerateMeme={handleGenerateMeme}
          setMemePrompt={setMemePrompt}
        />

        <ResultSection
          currentStep={currentStep}
          generatedMeme={generatedMeme}
          templateExplanation={templateExplanation}
          templateFormat={templateFormat}
          isExplanationVisible={isExplanationVisible}
          setIsExplanationVisible={setIsExplanationVisible}
          contextChunks={contextChunks}
          handleDownloadMeme={handleDownloadMeme}
        />
      </main>
    </div>
  )
}

export default App
