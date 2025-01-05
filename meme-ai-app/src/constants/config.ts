export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const STEPS = {
  UPLOAD: 1,
  GENERATE: 2,
  RESULT: 3,
} as const;

export const ACCEPTED_FILE_TYPES = {
  TXT: '.txt',
  ZIP: '.zip',
} as const;

export const ERROR_MESSAGES = {
  NO_TXT_IN_ZIP: 'No .txt file found in the ZIP archive',
  INVALID_FILE_TYPE: 'Please upload a .txt or .zip file',
  EXTRACT_FAILED: 'Failed to extract text file from ZIP',
  NO_IMAGE_DATA: 'No image data received from server',
} as const;

export const PROMPT_SUGGESTIONS = [
  {
    emoji: '🤣',
    text: 'מם על בדיחות של אחד מחברי הקבוצה',
    getPrompt: (sender: string) => `תעשה מם על הבדיחות של ${sender}`,
  },
  {
    emoji: '⏰',
    text: 'מם על האיחורים של אחד מחברי הקבוצה',
    getPrompt: (sender: string) => `תעשה מם על האיחורים של ${sender}`,
  },
  {
    emoji: '🍔',
    text: 'מם על האוכל שאחד מחברי הקבוצה מכין',
    getPrompt: (sender: string) => `תעשה מם על האוכל של ${sender}`,
  },
] as const; 