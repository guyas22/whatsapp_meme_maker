import { useState, useCallback } from 'react'
import './App.css'
import { ProgressBar } from './components/ProgressBar'
import { UploadSection } from './components/UploadSection'
import { MemeSection } from './components/MemeSection'
import { ResultSection } from './components/ResultSection'
import { useFileUpload } from './hooks/useFileUpload'
import { useMemeGeneration } from './hooks/useMemeGeneration'
import { API_BASE_URL, STEPS } from './constants/config'
import { downloadImage, shareImage } from './utils/memeUtils'

type Step = typeof STEPS[keyof typeof STEPS]

function App() {
  const [currentStep, setCurrentStep] = useState<Step>(STEPS.UPLOAD)
  const [isProcessed, setIsProcessed] = useState(false)
  const [senders, setSenders] = useState<string[]>([])
  const [groupName, setGroupName] = useState<string>('')
  const [isExplanationVisible, setIsExplanationVisible] = useState(false)

  const {
    file,
    dragActive,
    isLoading: fileLoading,
    error: fileError,
    handleDrag,
    handleDrop,
    handleFileUpload,
    handleProcessChat,
  } = useFileUpload(API_BASE_URL)

  const {
    memePrompt,
    generatedMeme,
    contextChunks,
    templateExplanation,
    templateFormat,
    isLoading: memeLoading,
    error: memeError,
    showMentions,
    mentionFilter,
    setMemePrompt,
    handleInputChange,
    handleMentionClick,
    handleGenerateMeme,
  } = useMemeGeneration(API_BASE_URL)

  const handleProcessChatWrapper = useCallback(async () => {
    const result = await handleProcessChat()
    if (result) {
      setSenders(result.senders)
      setGroupName(result.group_name)
      setIsProcessed(true)
      setCurrentStep(STEPS.GENERATE)
    }
  }, [handleProcessChat])

  const handleGenerateMemeWrapper = useCallback(async () => {
    await handleGenerateMeme()
    setCurrentStep(STEPS.RESULT)
  }, [handleGenerateMeme])

  const handleDownloadMeme = useCallback(() => {
    if (generatedMeme) {
      downloadImage(generatedMeme)
    }
  }, [generatedMeme])

  const handleShareMeme = useCallback(() => {
    if (generatedMeme) {
      shareImage(
        generatedMeme,
        'Check out my meme!',
        'Generated with WhatsApp Meme Generator'
      )
    }
  }, [generatedMeme])

  const testConnection = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/ping`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      console.log('Ping response:', data)
      alert('Connection successful! Server responded with: ' + data.message)
    } catch (error) {
      console.error('Connection test failed:', error)
      alert('Connection failed! Check console for details.')
    }
  }, [])

  return (
    <div className="app-container">
      <header>
        <h1>AI Meme Generator</h1>
        <p className="subtitle">Turn your WhatsApp chat conversations into hilarious memes!</p>
        <button onClick={testConnection} className="test-connection">
          Test Connection
        </button>
      </header>

      <ProgressBar currentStep={currentStep} />

      <main>
        {(fileError || memeError) && (
          <div className="error-message">
            {fileError || memeError}
          </div>
        )}

        <UploadSection
          currentStep={currentStep}
          file={file}
          isLoading={fileLoading}
          dragActive={dragActive}
          handleDrag={handleDrag}
          handleDrop={handleDrop}
          handleFileUpload={handleFileUpload}
          handleProcessChat={handleProcessChatWrapper}
        />

        <MemeSection
          currentStep={currentStep}
          isProcessed={isProcessed}
          groupName={groupName}
          senders={senders}
          memePrompt={memePrompt}
          isLoading={memeLoading}
          showMentions={showMentions}
          mentionFilter={mentionFilter}
          handleInputChange={handleInputChange}
          handleMentionClick={handleMentionClick}
          handleGenerateMeme={handleGenerateMemeWrapper}
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
          handleShareMeme={handleShareMeme}
        />
      </main>
    </div>
  )
}

export default App
