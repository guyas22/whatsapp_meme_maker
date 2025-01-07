import { useState, useCallback, useEffect } from 'react'
import './App.css'
import { Authenticator, useAuthenticator, View, Button } from '@aws-amplify/ui-react'
import { Amplify } from 'aws-amplify'
import { signOut as amplifySignOut } from 'aws-amplify/auth'
import outputs from '../amplify_outputs.json'
import '@aws-amplify/ui-react/styles.css'
import { ProgressBar } from './components/ProgressBar'
import { UploadSection } from './components/UploadSection'
import { MemeSection } from './components/MemeSection'
import { ResultSection } from './components/ResultSection'
import { LimitReachedSection } from './components/LimitReachedSection'
import { useFileUpload } from './hooks/useFileUpload'
import { useMemeGeneration } from './hooks/useMemeGeneration'
import { API_BASE_URL, STEPS } from './constants/config'
import { downloadImage, shareImage } from './utils/memeUtils'
import { useMemeCount } from './hooks/useMemeCount'

Amplify.configure(outputs)

type Step = typeof STEPS[keyof typeof STEPS]

function AppContent() {
  const { user } = useAuthenticator()
  const [currentStep, setCurrentStep] = useState<Step>(STEPS.UPLOAD)
  const [isProcessed, setIsProcessed] = useState(false)
  const [senders, setSenders] = useState<string[]>([])
  const [groupName, setGroupName] = useState<string>('')
  const [isExplanationVisible, setIsExplanationVisible] = useState(false)
  const { 
    count: memeCount, 
    loading: countLoading, 
    incrementCount,
    canGenerateMore,
    remainingMemes,
    error: countError
  } = useMemeCount(user?.username || '')

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
    if (!canGenerateMore) {
      setCurrentStep(STEPS.LIMIT_REACHED);
      return;
    }
    await handleGenerateMeme();
    await incrementCount();
    setCurrentStep(STEPS.RESULT);
  }, [handleGenerateMeme, incrementCount, canGenerateMore]);

  useEffect(() => {
    if (!canGenerateMore && currentStep !== STEPS.LIMIT_REACHED) {
      setCurrentStep(STEPS.LIMIT_REACHED);
    }
  }, [canGenerateMore, currentStep]);

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

  const handleSignOut = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    console.log('Sign out clicked')
    try {
      console.log('Attempting to sign out...')
      await amplifySignOut({ global: true })
      console.log('Sign out successful')
      window.location.reload() // Force reload after sign out
    } catch (error) {
      console.error('Error signing out:', error)
      alert('Failed to sign out. Please try again.')
    }
  }, [])

  return (
    <div className="app-container">
      <header>
        <div className="header-content">
          <h1>AI Meme Generator</h1>
          <p className="subtitle">Turn your WhatsApp chat conversations into hilarious memes!</p>
          <div className="header-actions">
            <button onClick={testConnection} className="test-connection">
              Test Connection
            </button>
            <Button
              onClick={handleSignOut}
              className="amplify-button sign-out-button"
              style={{
                cursor: 'pointer',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                color: 'white',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                fontSize: '0.9rem',
                marginLeft: '1rem',
                zIndex: 100
              }}
            >
              Sign Out
            </Button>
            <span className="user-info">
              Welcome, {user?.username}!
              {!countLoading && (
                <span className="meme-count">
                  ({memeCount} memes generated
                  {canGenerateMore ? `, ${remainingMemes} remaining` : ', limit reached'})
                </span>
              )}
            </span>
          </div>
        </div>
      </header>

      <ProgressBar currentStep={currentStep} />

      <main>
        {(fileError || memeError || countError) && (
          <div className="error-message" role="alert">
            <span className="error-icon">⚠️</span>
            <span>{fileError || memeError || countError}</span>
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
          canGenerateMore={canGenerateMore}
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

        <LimitReachedSection isVisible={currentStep === STEPS.LIMIT_REACHED} />
      </main>

      <footer className="footer">
        <p>Made with ❤️ by <a href="https://www.linkedin.com/in/guy-asulin-b3b1461ba/" target="_blank" rel="noopener noreferrer">Guy Asulin</a></p>
        <p><a href="https://github.com/guyas22/whatsapp_meme_maker" target="_blank" rel="noopener noreferrer">Github</a></p>
        <p className="job-status">psst... 👀 looking for a Software Engineering position!</p>
      </footer>
    </div>
  )
}

function App() {
  return (
    <Authenticator>
      <AppContent />
    </Authenticator>
  )
}

export default App
