import React from 'react';
import { Cpu, ArrowRight, Sparkles, AlertTriangle } from 'lucide-react';
import LocationPicker from '../LocationPicker';
import { GeminiErrorBoundary } from '../GeminiErrorBoundary';
import { GeminiErrorFallback } from '../GeminiErrorFallback';
import { CATEGORY_MANUAL_PRICE_RANGES } from '../../hooks/customer/useCreateJob';

interface CreateJobFormProps {
  title: string;
  setTitle: (val: string) => void;
  description: string;
  setDescription: (val: string) => void;
  category: string;
  setCategory: (val: string) => void;
  workflow: 'instant' | 'quotation';
  setWorkflow: (val: 'instant' | 'quotation') => void;
  address: string;
  setAddress: (val: string) => void;
  lat: number;
  setLat: (val: number) => void;
  lng: number;
  setLng: (val: number) => void;
  amount: number;
  setAmount: (val: number) => void;
  aiLoading: boolean;
  aiResult: any | null;
  setAiResult: (val: any) => void;
  aiError: string | null;
  setAiError: (val: string | null) => void;
  aiCooldown: number;
  aiFailCount: number;
  setShowSupportModal: (show: boolean) => void;
  handleAiEstimate: () => void;
  handleCreateJobSubmit: (e: React.FormEvent) => void;
}

export default function CreateJobForm({
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
  aiFailCount,
  setShowSupportModal,
  handleAiEstimate,
  handleCreateJobSubmit
}: CreateJobFormProps) {
  return (
    <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 text-left animate-fadeIn">
      <h3 className="font-display font-bold text-xl text-white mb-2">Request On-Demand Skilled Tradesperson</h3>
      <p className="text-slate-400 text-xs mb-6">Specify your job requirements. AI estimates pricing automatically before matching verified local tradesmen.</p>

      <form onSubmit={handleCreateJobSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <label htmlFor="create-job-title" className="text-xs text-gray-400 font-mono uppercase block mb-1">Service Order Title</label>
            <input
              id="create-job-title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Burst pipe under kitchen sink"
              aria-label="Service Order Title"
              className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent font-medium"
            />
          </div>

          <div>
            <label htmlFor="create-job-category" className="text-xs text-gray-400 font-mono uppercase block mb-1">Trade Specialty Category</label>
            <select
              id="create-job-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              aria-label="Trade Specialty Category"
              className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              <option value="Plumbing">Plumbing Trade</option>
              <option value="Electrical">Electrical Works</option>
              <option value="Construction">Construction & Masonry</option>
              <option value="Automotive">Automotive Mechanics</option>
              <option value="Cleaning">Cleaning Services</option>
              <option value="Outdoor">Outdoor & Gardening</option>
              <option value="Specialized">Specialized Trades</option>
            </select>
          </div>

          <LocationPicker 
            lat={lat} 
            lng={lng} 
            onChange={(newLat, newLng) => { setLat(newLat); setLng(newLng); }}
            address={address}
            onAddressChange={(newAddress) => setAddress(newAddress)}
          />

          <div>
            <label htmlFor="create-job-desc" className="text-xs text-gray-400 font-mono uppercase block mb-1">Service Description</label>
            <textarea
              id="create-job-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe exactly what you need. Be precise for AI accuracy."
              rows={3}
              aria-label="Service Description"
              className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="text-xs text-gray-400 font-mono uppercase block mb-1">Job System</span>
              <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-800/80" role="group" aria-label="Select job matching system">
                <button
                  type="button"
                  onClick={() => setWorkflow('instant')}
                  aria-label="Set job matching system to Uber-Style (instant matching)"
                  className={`flex-1 py-1.5 text-xs text-center rounded-md font-semibold cursor-pointer focus-visible:ring-2 focus-visible:ring-orange-500 focus:outline-none ${workflow === 'instant' ? 'bg-orange-500 text-slate-950' : 'text-slate-400'}`}
                >
                  Uber-Style
                </button>
                <button
                  type="button"
                  onClick={() => setWorkflow('quotation')}
                  aria-label="Set job matching system to Bidding (quotation model)"
                  className={`flex-1 py-1.5 text-xs text-center rounded-md font-semibold cursor-pointer focus-visible:ring-2 focus-visible:ring-orange-500 focus:outline-none ${workflow === 'quotation' ? 'bg-orange-500 text-slate-950' : 'text-slate-400'}`}
                >
                  Bidding
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="create-job-amount" className="text-xs text-gray-400 font-mono uppercase block mb-1">Bid/Contract amount (KES)</label>
              <input
                id="create-job-amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                aria-label="Bid or contract amount in KES"
                className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent font-mono"
              />
            </div>
          </div>
        </div>

        {/* Live Gemini-powered pricing Assistant */}
        <div className="space-y-4 flex flex-col justify-between">
          <GeminiErrorBoundary onHelpTriggered={() => setShowSupportModal(true)}>
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono text-orange-400 font-bold flex items-center space-x-1">
                  <Cpu className="w-3.5 h-3.5" />
                  <span>GEMINI AI PRICE ESTIMATION MVP</span>
                </span>
                <button
                  type="button"
                  disabled={aiLoading || !title || aiCooldown > 0}
                  onClick={handleAiEstimate}
                  aria-label="Ask Gemini AI for pricing estimate advice"
                  className="p-1 px-3 rounded-lg bg-orange-500 text-slate-950 hover:bg-orange-400 transition font-mono text-[10px] font-bold cursor-pointer disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 focus:outline-none"
                >
                  {aiLoading ? 'Analyzing...' : aiCooldown > 0 ? `WAIT ${aiCooldown}s` : 'ASK GEMINI'}
                </button>
              </div>

              {aiLoading ? (
                <div className="space-y-4 py-3 animate-pulse">
                  <div className="flex justify-between items-center py-2 border-b border-slate-800/60">
                    <div className="h-3.5 bg-slate-800 rounded w-1/3"></div>
                    <div className="h-4 bg-slate-800 rounded w-1/4 animate-bounce"></div>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-800/60">
                    <div className="h-3.5 bg-slate-800 rounded w-1/3"></div>
                    <div className="h-4 bg-slate-800 rounded w-1/5"></div>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-800/60">
                    <div className="h-3.5 bg-slate-800 rounded w-1/3"></div>
                    <div className="h-4 bg-slate-800 rounded w-1/6"></div>
                  </div>
                  <div className="space-y-2 pt-1">
                    <div className="h-3 bg-slate-800 rounded w-1/2"></div>
                    <div className="h-2.5 bg-slate-800 rounded w-5/6"></div>
                    <div className="h-2.5 bg-slate-800 rounded w-2/3"></div>
                  </div>
                </div>
              ) : aiError ? (
                <div className="space-y-3">
                  <GeminiErrorFallback
                    error={aiError}
                    jobTitle={title}
                    jobDescription={description}
                    jobCategory={category}
                    jobLocation={address}
                    onRetry={handleAiEstimate}
                  />
                  
                  {aiFailCount >= 2 && (
                    <div className="bg-emerald-950/20 border border-emerald-500/20 p-4 rounded-xl space-y-3 mt-3 animate-fadeIn" id="gemini-fallback-mode-block">
                      <div className="flex items-start space-x-2">
                        <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <h5 className="text-[11px] font-mono font-bold text-emerald-400 uppercase tracking-wider">Suggested Local Fallback</h5>
                          <p className="text-[10px] text-slate-300 leading-relaxed">
                            Multiple estimation attempts have failed. Based on the selected <strong>{category}</strong> category, we suggest a standard local trade range:
                          </p>
                        </div>
                      </div>
                      
                      <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800 flex justify-between items-center">
                        <div>
                          <span className="text-[9px] font-mono text-slate-400 block uppercase">Standard Range</span>
                          <span className="text-xs font-semibold text-slate-200 font-mono">
                            KES {CATEGORY_MANUAL_PRICE_RANGES[category]?.min.toLocaleString()} - {CATEGORY_MANUAL_PRICE_RANGES[category]?.max.toLocaleString()}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-[9px] font-mono text-slate-400 block uppercase">Recommended</span>
                          <span className="text-xs font-semibold text-emerald-400 font-mono">
                            KES {CATEGORY_MANUAL_PRICE_RANGES[category]?.recommended.toLocaleString()}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          const fallbackData = CATEGORY_MANUAL_PRICE_RANGES[category] || CATEGORY_MANUAL_PRICE_RANGES.Plumbing;
                          setAmount(fallbackData.recommended);
                          setAiResult({
                            estimated_amount: fallbackData.recommended,
                            duration_estimate: "1 - 3 hours",
                            standard_risk_score: 1,
                            price_breakdown: [
                              `Standard callout rate for ${category}: KES ${fallbackData.min}`,
                              `Typical minor materials allowance: KES ${fallbackData.recommended - fallbackData.min}`
                            ],
                            fraud_flags: []
                          });
                          setAiError(null);
                        }}
                        className="w-full py-1.5 px-3 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-semibold rounded-lg border border-emerald-500/35 transition font-mono cursor-pointer uppercase tracking-wider text-center"
                        id="apply-fallback-estimate-btn"
                      >
                        Apply Recommended Fallback (KES {CATEGORY_MANUAL_PRICE_RANGES[category]?.recommended.toLocaleString()})
                      </button>
                    </div>
                  )}
                </div>
              ) : aiResult ? (
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-slate-800/60">
                    <span className="text-xs text-slate-400">Fair Market Estimate:</span>
                    <span className="text-sm font-semibold text-emerald-400 font-mono">
                      KES {(aiResult.estimated_amount ?? aiResult.recommended ?? 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-800/60">
                    <span className="text-xs text-slate-400">Typical Duration:</span>
                    <span className="text-sm text-slate-200">
                      {aiResult.duration_estimate ?? aiResult.range ?? 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-800/60">
                    <span className="text-xs text-slate-400">Task Complexity:</span>
                    <span className="text-sm text-amber-400">
                      Risk {aiResult.standard_risk_score ?? 'N/A'}/10
                    </span>
                  </div>
                  
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 font-mono block mb-1">ESTIMATION BREAKDOWN:</span>
                    <ul className="list-disc pl-4 space-y-0.5 text-[10px] text-slate-300">
                      {(aiResult.price_breakdown ?? (aiResult.justification ? [aiResult.justification] : [])).map((item: string, idx: number) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>

                  {(aiResult.fraud_flags ?? []).length > 0 && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] p-2.5 rounded-xl flex items-start space-x-1.5 mt-2">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>{(aiResult.fraud_flags ?? [])[0]}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <span className="text-xs block">AI details will render here.</span>
                  <span className="text-[10px] font-italic mt-1 block">Specify title, description, location, then click 'ASK GEMINI'</span>
                </div>
              )}
            </div>
          </GeminiErrorBoundary>

          <button
            type="submit"
            className="w-full py-4.5 rounded-xl bg-orange-500 text-slate-950 font-bold font-display hover:bg-orange-400 transition flex items-center justify-center space-x-2 shadow-lg shadow-orange-500/20"
          >
            <span>LAUNCH ORDER DISPATCH</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
