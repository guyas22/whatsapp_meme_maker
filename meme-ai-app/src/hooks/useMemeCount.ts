import { useState, useEffect } from 'react';
import { generateClient } from 'aws-amplify/data';
import { type Schema } from '../../amplify/data/resource';

const client = generateClient<Schema>();
const MEME_LIMIT = 5;

export const useMemeCount = (userId: string) => {
  const [count, setCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (userId) {
      console.log('UseMemeCount: Initializing with userId:', userId);
      fetchMemeCount();
    }
  }, [userId]);

  const fetchMemeCount = async () => {
    if (!userId) return;
    
    try {
      setLoading(true);
      setError(null);
      console.log('UseMemeCount: Fetching count for userId:', userId);
      
      // Try to get existing record
      const { data: record } = await client.models.MemeCount.get({ userId });
      console.log('UseMemeCount: Fetched record:', record);
      
      if (record) {
        console.log('UseMemeCount: Setting count to:', record.count);
        setCount(record.count);
      } else {
        console.log('UseMemeCount: No existing record, creating new one');
        // Initialize count if it doesn't exist
        const { data: newRecord } = await client.models.MemeCount.create({
          userId,
          count: 0,
          lastGeneratedAt: new Date().toISOString(),
        });
        
        if (newRecord) {
          console.log('UseMemeCount: Created new record:', newRecord);
          setCount(0);
        } else {
          throw new Error('Failed to create initial meme count record');
        }
      }
    } catch (err) {
      console.error('Error in fetchMemeCount:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch meme count');
    } finally {
      setLoading(false);
    }
  };

  const incrementCount = async () => {
    if (!userId) return;
    if (count >= MEME_LIMIT) {
      setError(`You've reached your limit of ${MEME_LIMIT} memes`);
      return;
    }
    
    try {
      setError(null);
      const newCount = count + 1;
      console.log('UseMemeCount: Incrementing count from', count, 'to', newCount);
      
      // Update the record
      const { data: updatedRecord } = await client.models.MemeCount.update({
        userId,
        count: newCount,
        lastGeneratedAt: new Date().toISOString(),
      });
      
      if (updatedRecord) {
        console.log('UseMemeCount: Successfully updated record:', updatedRecord);
        setCount(newCount);
      } else {
        throw new Error('Failed to update meme count');
      }
    } catch (err) {
      console.error('Error in incrementCount:', err);
      setError(err instanceof Error ? err.message : 'Failed to increment meme count');
      // Try to re-fetch the count to ensure UI is in sync
      await fetchMemeCount();
    }
  };

  const canGenerateMore = count < MEME_LIMIT;
  const remainingMemes = MEME_LIMIT - count;

  return {
    count,
    loading,
    error,
    incrementCount,
    canGenerateMore,
    remainingMemes,
  };
}; 