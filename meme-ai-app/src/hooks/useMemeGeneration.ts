import { useState } from 'react';
import { createImageUrlFromHexData } from '../utils/memeUtils';

interface UseMemeGenerationReturn {
  memePrompt: string;
  generatedMeme: string | null;
  contextChunks: Array<{ content: string; metadata: any }>;
  templateExplanation: string | null;
  templateFormat: string | null;
  isLoading: boolean;
  error: string | null;
  showMentions: boolean;
  mentionFilter: string;
  cursorPosition: number;
  setMemePrompt: (prompt: string) => void;
  handleInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleMentionClick: (sender: string) => void;
  handleGenerateMeme: () => Promise<void>;
}

export const useMemeGeneration = (apiBaseUrl: string): UseMemeGenerationReturn => {
  const [memePrompt, setMemePrompt] = useState('');
  const [generatedMeme, setGeneratedMeme] = useState<string | null>(null);
  const [contextChunks, setContextChunks] = useState<Array<{ content: string; metadata: any }>>([]);
  const [templateExplanation, setTemplateExplanation] = useState<string | null>(null);
  const [templateFormat, setTemplateFormat] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionFilter, setMentionFilter] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const position = e.target.selectionStart || 0;
    setMemePrompt(value);
    setCursorPosition(position);

    const lastAtSymbol = value.lastIndexOf('@', position);
    if (lastAtSymbol !== -1 && lastAtSymbol < position) {
      const textAfterAt = value.slice(lastAtSymbol + 1, position);
      setMentionFilter(textAfterAt.toLowerCase());
      setShowMentions(true);
    } else {
      setShowMentions(false);
    }
  };

  const handleMentionClick = (sender: string) => {
    const lastAtSymbol = memePrompt.lastIndexOf('@', cursorPosition);
    if (lastAtSymbol !== -1) {
      const newPrompt = memePrompt.slice(0, lastAtSymbol) + '@' + sender + memePrompt.slice(cursorPosition);
      setMemePrompt(newPrompt);
    }
    setShowMentions(false);
  };

  const handleGenerateMeme = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${apiBaseUrl}/api/generate-meme`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: memePrompt }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      const imageUrl = createImageUrlFromHexData(result.image_data);
      setGeneratedMeme(imageUrl);
      
      const processedChunks = result.context_chunks.map((chunk: [string, any]) => ({
        content: chunk[0],
        metadata: chunk[1]
      }));

      setContextChunks(processedChunks);
      
      setTemplateExplanation(result.template_explanation);
      setTemplateFormat(result.template_format);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate meme');
    } finally {
      setIsLoading(false);
    }
  };

  return {
    memePrompt,
    generatedMeme,
    contextChunks,
    templateExplanation,
    templateFormat,
    isLoading,
    error,
    showMentions,
    mentionFilter,
    cursorPosition,
    setMemePrompt,
    handleInputChange,
    handleMentionClick,
    handleGenerateMeme
  };
}; 