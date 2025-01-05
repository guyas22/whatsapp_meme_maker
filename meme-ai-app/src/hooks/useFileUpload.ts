import { useState } from 'react';
import JSZip from 'jszip';

interface UseFileUploadReturn {
  file: File | null;
  dragActive: boolean;
  isLoading: boolean;
  error: string | null;
  handleDrag: (e: React.DragEvent) => void;
  handleDrop: (e: React.DragEvent) => void;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleProcessChat: () => Promise<{ senders: string[]; group_name: string; } | undefined>;
  setFile: (file: File | null) => void;
  setError: (error: string | null) => void;
}

export const useFileUpload = (apiBaseUrl: string): UseFileUploadReturn => {
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const extractTxtFromZip = async (zipFile: File): Promise<File | null> => {
    try {
      const zip = new JSZip();
      const zipContents = await zip.loadAsync(zipFile);
      
      const txtFiles = Object.values(zipContents.files).filter(file => 
        !file.dir && file.name.toLowerCase().endsWith('.txt')
      );
      
      if (txtFiles.length === 0) {
        throw new Error('No .txt file found in the ZIP archive');
      }

      const txtFile = txtFiles[0];
      const content = await txtFile.async('blob');
      
      return new File([content], txtFile.name, { type: 'text/plain' });
    } catch (err) {
      console.error('Error extracting txt from zip:', err);
      throw new Error('Failed to extract text file from ZIP');
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    setError(null);
    
    const droppedFile = e.dataTransfer.files?.[0];
    if (!droppedFile) return;

    try {
      if (droppedFile.name.endsWith('.zip')) {
        const extractedFile = await extractTxtFromZip(droppedFile);
        if (extractedFile) {
          setFile(extractedFile);
        }
      } else if (droppedFile.name.endsWith('.txt')) {
        setFile(droppedFile);
      } else {
        setError('Please upload a .txt or .zip file');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error processing file');
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = event.target.files?.[0];
    if (!uploadedFile) return;
    
    setError(null);
    
    try {
      if (uploadedFile.name.endsWith('.zip')) {
        const extractedFile = await extractTxtFromZip(uploadedFile);
        if (extractedFile) {
          setFile(extractedFile);
        }
      } else if (uploadedFile.name.endsWith('.txt')) {
        setFile(uploadedFile);
      } else {
        setError('Please upload a .txt or .zip file');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error processing file');
    }
  };

  const handleProcessChat = async () => {
    if (!file) return;

    setIsLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${apiBaseUrl}/api/ingest-chat`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || `Error processing chat: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        senders: data.senders || [],
        group_name: data.group_name || ''
      };
    } catch (err) {
      console.error('Process chat error:', err);
      setError(err instanceof Error ? err.message : 'Error processing chat file');
    } finally {
      setIsLoading(false);
    }
  };

  return {
    file,
    dragActive,
    isLoading,
    error,
    handleDrag,
    handleDrop,
    handleFileUpload,
    handleProcessChat,
    setFile,
    setError
  };
}; 