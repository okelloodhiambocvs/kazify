import React from 'react';

interface BidFormProps {
  bidAmount: number;
  setBidAmount: (val: number) => void;
  bidDuration: number;
  setBidDuration: (val: number) => void;
  bidNote: string;
  setBidNote: (val: string) => void;
  handleSubmitBid: (e: React.FormEvent) => void;
}

export default function BidForm({
  bidAmount,
  setBidAmount,
  bidDuration,
  setBidDuration,
  bidNote,
  setBidNote,
  handleSubmitBid
}: BidFormProps) {
  return (
    <form onSubmit={handleSubmitBid} className="space-y-4 border-t border-slate-900 pt-4">
      <span className="text-xs text-orange-400 font-bold block">SUBMIT QUOTATION PROPOSAL</span>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="fundi-bid-amount" className="text-xs text-gray-400 font-mono block mb-1">Your Price Offer (KES)</label>
          <input
            id="fundi-bid-amount"
            type="number"
            value={bidAmount}
            onChange={(e) => setBidAmount(parseFloat(e.target.value) || 0)}
            aria-label="Your Price Offer in KES"
            className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent font-mono"
          />
        </div>

        <div>
          <label htmlFor="fundi-bid-duration" className="text-xs text-gray-400 font-mono block mb-1">Work Time (Days)</label>
          <input
            id="fundi-bid-duration"
            type="number"
            value={bidDuration}
            onChange={(e) => setBidDuration(parseInt(e.target.value) || 1)}
            aria-label="Estimated Work Time in Days"
            className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent font-mono"
          />
        </div>
      </div>

      <div>
        <label htmlFor="fundi-bid-note" className="text-xs text-gray-400 font-mono block mb-1">Your Pitch Note</label>
        <textarea
          id="fundi-bid-note"
          value={bidNote}
          onChange={(e) => setBidNote(e.target.value)}
          rows={2}
          aria-label="Your Pitch Note to Client"
          className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl py-2 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
        />
      </div>

      <button
        type="submit"
        aria-label="Submit quotation details proposal"
        className="w-full py-3 rounded-xl bg-orange-500 text-slate-950 font-bold text-xs hover:bg-orange-400 transition cursor-pointer focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 focus:outline-none"
      >
        SUBMIT QUOTATION DETAILS
      </button>
    </form>
  );
}
