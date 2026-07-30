import { useState } from 'react';
import { User, Job } from '../../types';
import api from '../../services/api';

export function useFundiBids(user: User, selectedJob: Job | null, onBidSubmitted: () => void) {
  const [bidAmount, setBidAmount] = useState<number>(1000);
  const [bidNote, setBidNote] = useState('I can solve this leak using professional high-grade copper fittings.');
  const [bidDuration, setBidDuration] = useState<number>(1);

  const handleSubmitBid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJob) return;

    try {
      await api.post('/api/bids', {
        job_id: selectedJob.id,
        fundi_id: user.id,
        amount: bidAmount,
        note: bidNote,
        duration_days: bidDuration
      });
      alert('Your bid quote was submitted successfully!');
      onBidSubmitted();
    } catch (err) {
      console.error('Bid post failure', err);
    }
  };

  return {
    bidAmount,
    setBidAmount,
    bidNote,
    setBidNote,
    bidDuration,
    setBidDuration,
    handleSubmitBid
  };
}
