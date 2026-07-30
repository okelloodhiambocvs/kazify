import React, { useState } from 'react';
import { CheckCircle2, Send } from 'lucide-react';

export const ContactFormTab: React.FC = () => {
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [formSubmitted, setFormSubmitted] = useState(false);

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitted(true);
    setTimeout(() => {
      setFormSubmitted(false);
      setContactName('');
      setContactEmail('');
      setContactMessage('');
    }, 4000);
  };

  return (
    <div className="space-y-4">
      <p>
        Reach out to our regional operations teams in Kisumu, Nairobi, or Mombasa.
      </p>

      {formSubmitted ? (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <div>
            <span className="font-bold block text-emerald-300">Inquiry Received!</span>
            <span>Our support desk will respond to your email or mobile within 2 business hours.</span>
          </div>
        </div>
      ) : (
        <form onSubmit={handleContactSubmit} className="space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-1">Your Name</label>
              <input 
                type="text" 
                placeholder="John Doe"
                value={contactName}
                onChange={e => setContactName(e.target.value)}
                required
                className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs dark:text-white"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-1">Email / Phone</label>
              <input 
                type="text" 
                placeholder="0700000000 or user@example.com"
                value={contactEmail}
                onChange={e => setContactEmail(e.target.value)}
                required
                className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs dark:text-white"
              />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-1">Message</label>
            <textarea 
              rows={3} 
              placeholder="How can our regional team assist you?"
              value={contactMessage}
              onChange={e => setContactMessage(e.target.value)}
              required
              className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs dark:text-white resize-none"
            />
          </div>
          <button 
            type="submit" 
            className="w-full bg-orange-500 hover:bg-orange-600 text-slate-950 font-bold py-2 rounded-lg text-xs flex items-center justify-center gap-1.5 transition duration-200"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Submit Inquiry</span>
          </button>
        </form>
      )}
    </div>
  );
};
