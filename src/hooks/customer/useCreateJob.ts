import { useState, useEffect, useRef } from 'react';
import { User, Job } from '../../types';
import api from '../../services/api';
import { validateGeminiEstimateResponse } from '../../utils/geminiValidation';
import { performGeminiHandshake } from '../../utils/geminiDiagnostics';

export const CATEGORY_MANUAL_PRICE_RANGES: Record<string, { min: number, max: number, recommended: number, description: string }> = {
  Plumbing: { min: 1000, max: 5000, recommended: 2500, description: "Typical leak repair, unclogging, or pipe fixtures." },
  Electrical: { min: 1500, max: 8000, recommended: 3500, description: "Wiring fix, sockets replacement, or diagnostics." },
  Construction: { min: 3000, max: 20000, recommended: 8500, description: "Masonry work, small structural fixes, tiling, or remodeling." },
  Automotive: { min: 1200, max: 10000, recommended: 4000, description: "Mechanical engine diagnostics, battery swap, or brake service." },
  Cleaning: { min: 800, max: 4000, recommended: 1800, description: "Deep cleaning, dry-cleaning, sofa vacuuming, or post-construction dust removal." },
  Outdoor: { min: 1000, max: 6000, recommended: 3000, description: "Gardening, compound clear-up, tree pruning, or landscaping." },
  Specialized: { min: 2500, max: 15000, recommended: 6000, description: "CCTV surveillance setup, advanced smart lock installations, or diagnostics." }
};

export function useCreateJob(user: User, onJobCreated: (newJob: Job) => void) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Plumbing');
  const [workflow, setWorkflow] = useState<'instant' | 'quotation'>('instant');
  const [address, setAddress] = useState('Nairobi CBD Center');
  const [lat, setLat] = useState<number>(-1.286389);
  const [lng, setLng] = useState<number>(36.817223);
  const [amount, setAmount] = useState<number>(1200);

  // AI Assistant Estimation state
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<any | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiCooldown, setAiCooldown] = useState(0);
  const lastTriggerTimeRef = useRef<number>(0);

  // Diagnostic & Handshake state
  const [handshakeResult, setHandshakeResult] = useState<{ status: 'ok' | 'error' | 'pending'; message?: string } | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [aiFailCount, setAiFailCount] = useState(0);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const aiAbortControllerRef = useRef<AbortController | null>(null);

  // Cooldown timer effect
  useEffect(() => {
    if (aiCooldown > 0) {
      const timer = setTimeout(() => {
        setAiCooldown(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [aiCooldown]);

  // Diagnostic handshake effect when form is open
  useEffect(() => {
    if (showCreateForm) {
      setHandshakeResult({ status: 'pending' });
      performGeminiHandshake().then((res) => {
        setHandshakeResult(res);
        if (res.status === 'error') {
          setShowToast(true);
        }
      });
    } else {
      setShowToast(false);
      setHandshakeResult(null);
      if (aiAbortControllerRef.current) {
        aiAbortControllerRef.current.abort();
        aiAbortControllerRef.current = null;
      }
    }
  }, [showCreateForm]);

  useEffect(() => {
    return () => {
      if (aiAbortControllerRef.current) {
        aiAbortControllerRef.current.abort();
      }
    };
  }, []);

  const handleAiEstimate = async () => {
    if (!title) return;

    const now = Date.now();
    const timeSinceLast = now - lastTriggerTimeRef.current;
    if (timeSinceLast < 4000) {
      const remainingSecs = Math.ceil((4000 - timeSinceLast) / 1000);
      setAiCooldown(remainingSecs);
      return;
    }

    lastTriggerTimeRef.current = now;

    if (aiAbortControllerRef.current) {
      aiAbortControllerRef.current.abort();
    }

    const controller = new AbortController();
    aiAbortControllerRef.current = controller;

    setAiLoading(true);
    setAiError(null);
    setAiResult(null);
    
    try {
      const res = await api.post('/api/ai/estimate', {
        title,
        description,
        category,
        locationName: address
      }, {
        signal: controller.signal
      });
      
      const data = res.data;
      if (!data) {
        throw new Error('Received empty or null response from the server.');
      }
      
      if (typeof data !== 'object') {
        throw new Error(`Expected a JSON object but received type "${typeof data}".`);
      }
      
      const isValid = validateGeminiEstimateResponse(data);
      if (!isValid) {
        throw new Error('Service Temporarily Unavailable');
      }
      
      const estimatedAmt = data.estimated_amount;
      setAiResult(data);
      setAmount(estimatedAmt);
      setAiFailCount(0);
    } catch (err: any) {
      if (err.name === 'CanceledError' || err.name === 'AbortError') {
        return;
      }

      console.error('[AI Estimate] Pricing estimation request failed:', err);
      setAiFailCount(prev => prev + 1);

      if (err.message === 'Service Temporarily Unavailable') {
        setAiError('Service Temporarily Unavailable');
      } else {
        const serverErrorMessage = err.response?.data?.error || err.response?.data?.details;
        const finalErrorMessage = serverErrorMessage || err.message || "Failed to process the AI estimation. Please try again.";
        setAiError(finalErrorMessage);
      }
    } finally {
      if (aiAbortControllerRef.current === controller) {
        aiAbortControllerRef.current = null;
      }
      setAiLoading(false);
    }
  };

  const handleCreateJobSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/api/jobs', {
        customer_id: user.id,
        title,
        description,
        category,
        workflow,
        lat,
        lng,
        address,
        amount
      });
      const newJob = res.data;
      setTitle('');
      setDescription('');
      setLat(-0.0917);
      setLng(34.7680);
      setAiResult(null);
      setShowCreateForm(false);
      onJobCreated(newJob);
    } catch (err) {
      console.error('Post job failed', err);
    }
  };

  return {
    showCreateForm,
    setShowCreateForm,
    title,
    setTitle,
    description,
    setDescription,
    category,
    setCategory,
    workflow,
    setWorkflow,
    address,
    setAddress,
    lat,
    setLat,
    lng,
    setLng,
    amount,
    setAmount,
    aiLoading,
    aiResult,
    setAiResult,
    aiError,
    setAiError,
    aiCooldown,
    handshakeResult,
    showToast,
    setShowToast,
    aiFailCount,
    showSupportModal,
    setShowSupportModal,
    handleAiEstimate,
    handleCreateJobSubmit
  };
}
