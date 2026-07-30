import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQProps {
  darkMode: boolean;
}

export const FAQ: React.FC<FAQProps> = ({ darkMode }) => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const faqs: FAQItem[] = [
    {
      question: 'What is Kazify and how does it work in Kenya?',
      answer: 'Kazify is Kenya\'s premier digital marketplace connecting certified local tradespersons (Fundis) with households and businesses. Clients can post custom jobs to receive competitive bids, or search and dispatch the nearest experts. The platform coordinates communication, milestone booking, and secure escrow payouts.',
    },
    {
      question: 'How does the M-Pesa Escrow Wallet guarantee my money\'s safety?',
      answer: 'Your payments are held securely in a multi-layered escrow account linked directly via standard M-Pesa STK Push. Once you accept a quote, funds are secured in escrow and are only released to the Fundi after the service is completed, verified, and you click "Release Funds" from your client center. This fully protects both clients and tradespeople.',
    },
    {
      question: 'Are Fundis on Kazify certified and compliant with CBK AML regulations?',
      answer: 'Absolutely. Every service expert on Kazify undergoes high-level background checks in compliance with the Central Bank of Kenya (CBK) Anti-Money Laundering (AML) guidelines. Registered experts are required to upload digital copies of their National ID or Passport and valid NITA (National Industrial Training Authority) or other relevant trade certifications before they are authorized to place bids or accept booking requests.',
    },
    {
      question: 'How does the Booking Availability Calendar work?',
      answer: 'Every verified tradesperson has an interactive Booking Availability Calendar integrated directly into their professional profile. This calendar allows Fundis to designate their preferred working hours, select their active service days, and block off unavailable dates. Clients can view these operating blocks in real-time to pick a convenient, available date and propose it during client chats.',
    },
    {
      question: 'What should I do if a dispute arises during a service?',
      answer: 'Kazify maintains a structured Dispute Resolution Room where clients and service providers can lodge complaints, share progress photos, and coordinate with an independent platform mediator. While a dispute is open, the escrow wallet holding the service payment remains locked until a consensus is reached or a formal resolution is completed.',
    },
    {
      question: 'How can I register as a skilled service provider (Fundi)?',
      answer: 'Skilled professionals can register by clicking "Access Platform" and selecting the "Register as a Service Provider (Fundi)" option. You will be prompted to submit your KYC documentation (National ID/Passport), location preferences, and professional trade certifications (such as NITA licenses). Once our compliance desk verifies your credentials, you can immediately begin bidding on local tasks.'
    }
  ];

  return (
    <section id="faq" className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 w-full">
      <div className="text-center mb-12">
        <span className="text-[10px] bg-orange-500/10 text-orange-500 border border-orange-500/20 px-3 py-1 rounded-full font-mono uppercase tracking-widest font-bold">
          COMMON INQUIRIES
        </span>
        <h2 className={`font-display text-3xl font-extrabold tracking-tight mt-3 transition-colors duration-300 ${
          darkMode ? 'text-white' : 'text-slate-900'
        }`}>
          Frequently Asked Questions
        </h2>
        <p className={`mt-2 text-sm max-w-lg mx-auto transition-colors duration-300 ${
          darkMode ? 'text-slate-400' : 'text-slate-500'
        }`}>
          Find answers to standard system validation, escrow payouts, and contractor verification steps across Kenya.
        </p>
      </div>

      <div className="space-y-3">
        {faqs.map((faq, idx) => {
          const isOpen = openFaq === idx;
          return (
            <div 
              key={idx}
              className={`rounded-2xl overflow-hidden transition-all duration-300 ${
                darkMode 
                  ? 'bg-slate-900 border border-slate-800 hover:border-slate-700/80' 
                  : 'bg-white border border-slate-200/80 hover:border-slate-300'
              }`}
            >
              <button
                onClick={() => setOpenFaq(isOpen ? null : idx)}
                className={`w-full flex items-center justify-between p-5 text-left font-semibold transition-colors focus:outline-none ${
                  darkMode ? 'text-slate-100 hover:text-orange-400' : 'text-slate-900 hover:text-orange-500'
                }`}
              >
                <span className="text-sm font-bold pr-4">{faq.question}</span>
                <ChevronDown 
                  className={`w-4 h-4 shrink-0 transition-transform duration-200 ${
                    isOpen 
                      ? 'rotate-180 text-orange-500' 
                      : (darkMode ? 'text-slate-500' : 'text-slate-400')
                  }`} 
                />
              </button>
              
              <div 
                className={`transition-all duration-200 ease-in-out overflow-hidden ${
                  isOpen 
                    ? `max-h-48 border-t ${darkMode ? 'border-slate-800/60' : 'border-slate-100'}` 
                    : 'max-h-0'
                }`}
              >
                <div className={`p-5 text-xs leading-relaxed font-mono transition-colors duration-300 ${
                  darkMode ? 'text-slate-400' : 'text-slate-500'
                }`}>
                  {faq.answer}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
