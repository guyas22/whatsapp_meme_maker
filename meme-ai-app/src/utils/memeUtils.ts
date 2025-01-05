export const getRandomSender = (senders: string[]): string => {
  return senders[Math.floor(Math.random() * senders.length)] || '';
};

export const createImageUrlFromHexData = (imageData: string): string => {
  const byteArray = new Uint8Array(
    imageData.match(/.{1,2}/g)?.map((byte: string) => parseInt(byte, 16)) || []
  );
  const blob = new Blob([byteArray], { type: 'image/jpeg' });
  return URL.createObjectURL(blob);
};

export const downloadImage = (imageUrl: string, fileName: string = 'generated-meme.jpg'): void => {
  const link = document.createElement('a');
  link.href = imageUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const shareImage = async (imageUrl: string, title: string, text: string): Promise<void> => {
  if (navigator.share) {
    try {
      await navigator.share({
        title,
        text,
        url: imageUrl
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  }
};

export const handleApiError = async (response: Response): Promise<never> => {
  const errorData = await response.json().catch(() => null);
  throw new Error(errorData?.error || `Error: ${response.statusText}`);
}; 