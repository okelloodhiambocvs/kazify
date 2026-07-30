import React, { useState } from 'react';
import { 
  X, Search, ShieldCheck, MapPin, Truck, HelpCircle, Briefcase, 
  ShieldAlert, DollarSign, Award, MessageSquare, Clock, Send, 
  UserCheck, Building, CheckCircle2, ChevronRight, AlertTriangle,
  Sparkles
} from 'lucide-react';
import { TrackJobTab } from './TrackJobTab';
import { ExpressDispatchTab } from './ExpressDispatchTab';
import { PickupStationsTab } from './PickupStationsTab';
import { CareersFormTab } from './CareersFormTab';
import { DisputeSimulationTab } from './DisputeSimulationTab';
import { ContactFormTab } from './ContactFormTab';

export interface FooterModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: string;
  darkMode: boolean;
}

export default function FooterModal({ isOpen, onClose, activeTab: initialTab, darkMode }: FooterModalProps) {
  const [activeTab, setActiveTab] = useState<string>(initialTab);

  if (!isOpen) return null;

  const footerDocs: { [key: string]: { title: string, subtitle: string, icon: any, content: React.ReactNode } } = {
    // ABOUT KAZIFY
    'about-us': {
      title: 'About Kazify',
      subtitle: 'Kenya\'s Premier Escrow-Backed Skilled Trades Marketplace',
      icon: Award,
      content: (
        <div className="space-y-4">
          <p className="leading-relaxed">
            <strong>Kazify</strong> is a certified digital marketplace built specifically to solve the trust deficit between local service seekers and skilled tradespeople (Fundis) in Kenya. Inspired by high-volume utility platforms, we combine professional peer-to-peer job matching with advanced, secure <strong>M-PESA backed escrow wallets</strong>.
          </p>
          <div className="border-l-4 border-orange-500 pl-4 py-1 italic bg-slate-50 dark:bg-slate-950/40 text-xs text-slate-600 dark:text-slate-300">
            "By ensuring that money remains locked securely until the client inspects and approves the job, we eliminate contractor exit fraud and customer non-payment disputes simultaneously."
          </div>
          <p>
            Operating across all <strong>47 counties in Kenya</strong> with head offices at Obotte Road in Kisumu, Kazify houses thousands of certified plumbers, electrical installers, carpenters, masons, mechanics, and HVAC technicians. Every contractor on Kazify undergoes intensive physical KYC, KRA PIN validation, and automated code-bypass safety screenings, offering landlords and private home-owners unprecedented trade compliance and ultimate safety.
          </p>
          <h4 className="font-bold text-sm text-orange-500 uppercase mt-4">Our Core Pillars</h4>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <li className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <span className="font-bold block mb-1">🛡️ Anti-Bypass Escrow Security</span>
              Payments are held in neutral escrow wallets. Funds are released step-by-step upon milestone approval.
            </li>
            <li className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <span className="font-bold block mb-1">🛠️ Verified Local Competence</span>
              Every Fundi carries physical ID checks, NITA vocational credentials, and real customer ratings.
            </li>
          </ul>
        </div>
      )
    },
    'refund-policy': {
      title: 'Returns and Refunds Policy',
      subtitle: 'Our Immutable Escrow Money-Back Protection',
      icon: ShieldCheck,
      content: (
        <div className="space-y-4">
          <p className="leading-relaxed">
            At Kazify, customer satisfaction is protected by cryptographic escrow vaults. When you lock funds for a contract, the service provider cannot withdraw any amount until you explicitly declare the milestone complete or the independent arbiter approves release.
          </p>
          <h4 className="font-bold text-xs text-orange-500 uppercase tracking-wider">Eligible Refund Conditions</h4>
          <ul className="list-disc pl-5 text-xs space-y-2">
            <li><strong>No-Show Cancellation:</strong> If a scheduled Tradesperson fails to check into the digital job radius within 2 hours of the designated dispatch window.</li>
            <li><strong>Substandard Craftsmanship:</strong> If the completed plumbing, wiring, or structural build fails to comply with National Industrial Training Authority (NITA) or local county building codes.</li>
            <li><strong>Mutual Contract Termination:</strong> If both the client and tradesman mutually agree to abort the contract before material usage has begun.</li>
          </ul>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs">
            <span className="font-bold block mb-1 text-orange-400">Processing Timeline</span>
            Once a refund is approved by our compliance desk or arbitration board, funds are instantly returned to your <strong>Kazify Wallet Balance</strong>. You can withdraw directly to M-PESA at any time, which typically posts within <strong>5 to 15 minutes</strong>.
          </div>
        </div>
      )
    },
    'careers': {
      title: 'Kazify Careers',
      subtitle: 'Build the Future of Skilled Trades in Africa',
      icon: Briefcase,
      content: <CareersFormTab />
    },
    'express': {
      title: 'Kazify Express Dispatcher',
      subtitle: 'Deploy Highly Certified Emergency Responders in 30 Minutes',
      icon: Clock,
      content: <ExpressDispatchTab />
    },
    'terms': {
      title: 'Terms and Conditions',
      subtitle: 'Kazify Marketplace Legal Framework & Escrow Guidelines',
      icon: ShieldCheck,
      content: (
        <div className="space-y-4 text-xs leading-relaxed">
          <p>
            Please read these terms carefully before accessing or using the Kazify escrow trades marketplace. By accessing this platform, you agree to comply with the standard contractual frameworks set forth below:
          </p>
          <div className="space-y-3">
            <div>
              <span className="font-bold text-orange-500 block mb-0.5">1. Strict Anti-Bypass Escrow Mandate</span>
              Users agree that all communication, price negotiation, contract definition, and payment transactions MUST be conducted strictly within the Kazify system. Off-platform direct payments are strictly prohibited and result in permanent registration bans, forfeiture of safety coverage, and security reporting.
            </div>
            <div>
              <span className="font-bold text-orange-500 block mb-0.5">2. Escrow Locks and Disbursals</span>
              Funds funded via Lipa Na M-PESA are held safely by the Kazify Escrow agent. They can only be disbursed when: (a) the client clicks milestone approval, (b) the tradesperson successfully uploads proof of delivery and the arbitration time window expires, or (c) an authorized Kazify arbitrator issues a final settlement ruling.
            </div>
            <div>
              <span className="font-bold text-orange-500 block mb-0.5">3. Workmanship Guarantee</span>
              Contractors guarantee that all structural works, wiring, and plumbing meet local safety guidelines and National Building Code standards.
            </div>
          </div>
        </div>
      )
    },
    'credit-terms': {
      title: 'Store Credit Terms',
      subtitle: 'Kazify Promos, Wallet Vouchers & Escrow Credits',
      icon: DollarSign,
      content: (
        <div className="space-y-4 text-xs">
          <p>
            We offer promo codes, wallet grants, and county vouchers as part of our trade development initiative across Kenya.
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>Non-Transferable:</strong> Store credits and promotional vouchers credited to your Kazify profile are strictly non-transferable and cannot be withdrawn as hard cash to M-PESA. They can only be used to pay for service contracts on the platform.</li>
            <li><strong>Expiration Cycles:</strong> Promo credits automatically expire 90 days from the date of issue unless stated otherwise in the promotion catalog.</li>
            <li><strong>Dispute Adjustments:</strong> If a job paid via store credit is successfully refunded via dispute resolution, the credit value is returned exclusively to the voucher balance, rather than convertible cash balances.</li>
          </ul>
        </div>
      )
    },
    'privacy': {
      title: 'Privacy Notice',
      subtitle: 'Data Encryption and Protection Policies',
      icon: Award,
      content: (
        <div className="space-y-4 text-xs">
          <p>
            Kazify is fully compliant with the <strong>Kenya Data Protection Act (2019)</strong>. We process, store, and manage your data with extreme care.
          </p>
          <h4 className="font-bold text-slate-300 block mb-1">What We Collect & How We Secure It:</h4>
          <ul className="space-y-2 list-decimal pl-4">
            <li><strong>Identity & KYC Documents:</strong> Your national ID, passport scans, and KRA PIN certificates are encrypted in transit and locked at rest using industrial AES-256 protocols. These are only visible to our compliance desk.</li>
            <li><strong>Location Data:</strong> Real-time coordinate GPS signals are tracked strictly when a job is in active progress to guarantee tradesman arrival times and dispute reviews. Location tracking is fully disabled when off-duty.</li>
            <li><strong>Chat Logs:</strong> Conversations are audited solely to detect off-platform billing bypass attempts, offensive behavior, and to provide evidence for dispute arbiters.</li>
          </ul>
        </div>
      )
    },
    'cookies': {
      title: 'Cookies Notice',
      subtitle: 'Session Integrity and Preferences',
      icon: Clock,
      content: (
        <div className="space-y-4 text-xs">
          <p>
            We use technical state cookies to ensure seamless navigation across the peer-to-peer dashboards.
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>Authentication Cookies:</strong> Keep your session securely logged in across county networks.</li>
            <li><strong>Preference Cookies:</strong> Remember your light/dark theme settings and your default county search queries.</li>
            <li><strong>Telemetry Cookies:</strong> Used strictly to throttle API call rates and secure payment checkouts against automated script injection.</li>
          </ul>
        </div>
      )
    },
    'flash-sales': {
      title: 'Kazify Trade Flash Sales',
      subtitle: 'Specialized High-Performance Trades at Massive Discounts',
      icon: Sparkles,
      content: (
        <div className="space-y-4 text-xs">
          <p>
            We organize scheduled county-wide Flash Sales offering up to <strong>25% discounts</strong> on specialized maintenance services, fully covered by our classic escrow guarantee!
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
              <span className="font-bold text-orange-400 block text-xs">Water Tank Sanitization</span>
              <p className="text-slate-400 text-[10px]">Thorough scrubbing, pressure chlorination, and leak audit by certified plumbers.</p>
              <div className="flex justify-between items-center pt-1.5 text-[10.5px]">
                <span className="font-mono text-slate-500 line-through">KES 8,000</span>
                <span className="font-mono font-bold text-white">KES 5,500 only</span>
              </div>
            </div>
            <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
              <span className="font-bold text-orange-400 block text-xs">Full DB Board Safety Audit</span>
              <p className="text-slate-400 text-[10px]">Breaker testing, surge protectors installation, and insulation resistance checks.</p>
              <div className="flex justify-between items-center pt-1.5 text-[10.5px]">
                <span className="font-mono text-slate-500 line-through">KES 6,500</span>
                <span className="font-mono font-bold text-white">KES 4,800 only</span>
              </div>
            </div>
          </div>
        </div>
      )
    },

    // USEFUL LINKS
    'track-order': {
      title: 'Track Your Order / Job Progress',
      subtitle: 'Real-time Escrow & Transit Telemetry Portal',
      icon: Search,
      content: <TrackJobTab />
    },
    'shipping': {
      title: 'Shipping and Delivery Guidelines',
      subtitle: 'Materials Logistics and On-Site Deployment',
      icon: Truck,
      content: (
        <div className="space-y-4 text-xs">
          <p className="leading-relaxed">
            While Kazify matches you with premier service professionals, construction or repairs often require physical materials (e.g., pipes, electrical conduits, plaster, bags of cement). We have standardized logistical fulfillment:
          </p>
          <div className="space-y-3">
            <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl">
              <span className="font-bold text-orange-400 block mb-0.5">🚀 Unified Procurement Workflow</span>
              The matched Fundi uploads a digitized shopping list/quote detailing necessary materials. You pay for it directly via the platform's quote processor, locking the funds in escrow.
            </div>
            <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl">
              <span className="font-bold text-orange-400 block mb-0.5">🏍️ Boda-Boda and Tuk-Tuk Delivery Partnership</span>
              Materials are auto-ordered from local certified brick-and-mortar hardware stores and dispatched immediately to your site using partner local transit. Track delivery coordinates in real-time.
            </div>
          </div>
        </div>
      )
    },
    'pickup-stations': {
      title: 'Pick-up Stations Across Kenya',
      subtitle: 'Collect Secure Material Packages & Trade Tools Near You',
      icon: MapPin,
      content: <PickupStationsTab />
    },
    'return-policy': {
      title: 'Material Return Policies',
      subtitle: 'Handling Excess or Unused Construction Vouchers',
      icon: ShieldAlert,
      content: (
        <div className="space-y-4 text-xs">
          <p>
            When carrying out hardware procurement under the quotation framework, some materials may remain unused. Here is how returns are resolved:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>Intact Materials:</strong> Sealed bags of cement, uncut pipes, or packed cabling can be returned to the origin hardware store within <strong>7 days of delivery</strong> for a full escrow wallet adjustment.</li>
            <li><strong>Verification Check:</strong> Returned goods must be verified as untouched and original by the County Logistics Officer before refunds post back to M-PESA.</li>
            <li><strong>No-Return Items:</strong> Custom-mixed paints or pre-cut custom glass elements are non-returnable.</li>
          </ul>
        </div>
      )
    },
    'how-to-order': {
      title: 'How to Order Services on Kazify',
      subtitle: 'A Step-by-Step Interactive Guide to Trade Hiring',
      icon: HelpCircle,
      content: (
        <div className="space-y-4 text-xs">
          <p>
            Hiring high-caliber, background-checked plumbers, carpenters, or masons is easy. Follow these simple steps:
          </p>
          <div className="space-y-3">
            <div className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-orange-500/10 text-orange-500 border border-orange-500/20 font-bold flex items-center justify-center text-xs flex-shrink-0">1</span>
              <div>
                <span className="font-bold block text-sm">Post a Job Request</span>
                Describe the repair or construction needs, specify the precise county location, and click 'Ask Gemini' or submit for bids.
              </div>
            </div>
            <div className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-orange-500/10 text-orange-500 border border-orange-500/20 font-bold flex items-center justify-center text-xs flex-shrink-0">2</span>
              <div>
                <span className="font-bold block text-sm">Receive & Compare Bids</span>
                Local verified contractors submit competitive quotations. You can review profiles, NITA accreditations, and previous project ratings.
              </div>
            </div>
            <div className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-orange-500/10 text-orange-500 border border-orange-500/20 font-bold flex items-center justify-center text-xs flex-shrink-0">3</span>
              <div>
                <span className="font-bold block text-sm">Fund the Escrow Wallet</span>
                Accept a quotation and fund the designated milestone securely using M-PESA. The money remains locked until you approve the completed work.
              </div>
            </div>
          </div>
        </div>
      )
    },
    'dispute-policy': {
      title: 'Dispute Resolution Center',
      subtitle: 'Neutral Arbitration Panel and Claim Submission',
      icon: ShieldAlert,
      content: <DisputeSimulationTab />
    },
    'corporate-bulk': {
      title: 'Corporate and Bulk Purchases',
      subtitle: 'Professional Trade Teams under Standard Service Agreements',
      icon: Award,
      content: (
        <div className="space-y-4 text-xs">
          <p>
            Are you a commercial real estate firm, property manager, estate syndicate, or contractor looking for robust construction trade services at scale?
          </p>
          <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
            <span className="font-bold text-orange-400 block text-xs">🔑 Enterprise Level SLA Support</span>
            <p className="text-slate-400 text-[10px]">Deploy standardized, drug-screened plumbing and high-voltage wiring crews. Every crew has active liability insurance policies under our master program.</p>
          </div>
          <p className="text-slate-400">
            For inquiries, please coordinate via <a href="mailto:corporate@kazify.com" className="text-orange-400 underline">corporate@kazify.com</a>.
          </p>
        </div>
      )
    },
    'advertise': {
      title: 'Advertise with Kazify',
      subtitle: 'Market Your Construction Materials and Tools to Millions',
      icon: MessageSquare,
      content: (
        <div className="space-y-4 text-xs">
          <p>
            Kazify is the highest-volume trades platform in western and central Kenya. Advertise physical hardware stocks, tools, safety helmets, or scaffolding to service providers and private contractors.
          </p>
          <h4 className="font-bold text-orange-400">Sponsored Ad Units</h4>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Premium Hardware Spotlights:</strong> Feature your physical storefront on local county maps.</li>
            <li><strong>Trade Category Banners:</strong> Promote specific tools (e.g. Bosch drills) inside electrician search portals.</li>
          </ul>
        </div>
      )
    },
    'report-product': {
      title: 'Report a Listing or Code Bypass',
      subtitle: 'Maintain Market Integrity and Trade Competency',
      icon: ShieldAlert,
      content: (
        <div className="space-y-4 text-xs">
          <p>
            Keep our digital market safe! Help us maintain safety by reporting off-platform payment solicitations, poor safety practices, or unregistered tradesmen.
          </p>
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2 text-left">
            <span className="text-orange-500 font-mono font-bold text-[9px] block uppercase">🚨 QUICK REPORT ANONYMOUSLY</span>
            <input 
              type="text" 
              placeholder="Detail bypass activity or listing ID"
              className="w-full bg-slate-900 border border-slate-800 text-white rounded-lg px-2.5 py-1.5 text-xs font-mono"
            />
            <button 
              type="button"
              onClick={() => alert('Integrity report securely routed to security audit desk.')}
              className="w-full bg-orange-500 hover:bg-orange-600 text-slate-950 font-bold py-1 rounded-lg text-xs transition duration-200"
            >
              Securely Route to Integrity Desk
            </button>
          </div>
        </div>
      )
    },
    'payment-guidelines': {
      title: 'Payment Security Guidelines',
      subtitle: 'Standard Escrow deposit and Withdrawal Operations',
      icon: DollarSign,
      content: (
        <div className="space-y-4 text-xs">
          <p>
            Kazify protects financial flows using local mobile-money frameworks. We have strict instructions regarding payment processing:
          </p>
          <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
            <div>
              <span className="font-bold text-orange-400 block text-xs">💳 Lipa Na M-PESA Paybill Setup</span>
              All deposits must be completed securely via the in-app payment popup linking M-PESA directly. We will never ask you to transfer funds to individual personal phone numbers.
            </div>
            <div>
              <span className="font-bold text-orange-400 block text-xs">🏦 Escrow Holds</span>
              Funds remain held in a certified merchant deposit trust under custody of Kazify until the customer approves work delivery or neutral arbitrators make a final ruling.
            </div>
          </div>
        </div>
      )
    },
    'black-friday': {
      title: 'Kazify Black Friday Trade Fest',
      subtitle: 'Renovation and Construction Services at All-time Lows',
      icon: Sparkles,
      content: (
        <div className="space-y-4 text-xs">
          <p>
            Every November, Kazify runs the massive <strong>Trade Fest Campaign</strong>! Get premium, verified tradespersons for home improvement, wiring overhaul, or painting at up to <strong>35% off</strong>, with the absolute peace of mind of escrow locks.
          </p>
          <div className="p-3 bg-orange-500/10 border border-orange-500/20 text-orange-400 rounded-xl">
            <strong>November 2026 Sneak Peek:</strong> Register your property portfolio early to claim free water system and pipeline pressure diagnostic sessions during the event.
          </div>
        </div>
      )
    },

    // MAKE MONEY WITH KAZIFY
    'sell': {
      title: 'Sell on Kazify as a Tradesperson',
      subtitle: 'Build a Thriving Trades Business with Guaranteed Payments',
      icon: Award,
      content: <CareersFormTab />
    },
    'vendor-hub': {
      title: 'Kazify Vendor Hub',
      subtitle: 'Partner Hardware Stores and Material Distribution Networks',
      icon: Building,
      content: (
        <div className="space-y-4 text-xs">
          <p>
            Are you a local hardware store owner in Kisumu, Nairobi, or Mombasa? Partner with Kazify Vendor Hub to get your inventory catalog linked into our automated job quotation system.
          </p>
          <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
            <span className="font-bold text-orange-400 block text-xs">🏪 Link Inventory API</span>
            <p className="text-slate-400 text-[10px]">When local Fundis quote for jobs, our system automatically compares inventory from verified local partners and fulfills deliveries instantly. M-PESA settlements paid within 24 hours.</p>
          </div>
          <p className="text-slate-500">
            Send partnerships requests to <a href="mailto:vendors@kazify.com" className="text-orange-400 underline">vendors@kazify.com</a> or coordinate with our regional lead on Obotte Road.
          </p>
        </div>
      )
    },
    'consultant': {
      title: 'Become a Sales Consultant',
      subtitle: 'Onboard Construction Companies and Earn Recurrent Commissions',
      icon: MessageSquare,
      content: (
        <div className="space-y-4 text-xs">
          <p>
            Join our county trade development referral network and earn high-yield recurring commissions on trade work.
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>Recurring Commission:</strong> Earn <strong>2.5%</strong> of all job escrow volumes processed by construction and property firms you onboard for the first 12 months.</li>
            <li><strong>County Outreach:</strong> Focus on linking estates, property management agents, and contractor collectives.</li>
          </ul>
        </div>
      )
    },
    'order-point': {
      title: 'Become A Kazify Order Point',
      subtitle: 'Convert Your Local Store into a Registration and Courier Station',
      icon: MapPin,
      content: (
        <div className="space-y-4 text-xs">
          <p>
            Own a physical retail outlet, hardware shop, or cyber café? Turn it into an official Kazify Order Point to facilitate KYC ID uploads, logistics locker collection, and receive commissions on local sign-ups.
          </p>
          <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl">
            <strong>Requirements:</strong> Physical storefront in a high-traffic area, stable electricity and internet, and capacity to handle small tool or material dropoffs.
          </div>
        </div>
      )
    },

    // NEED HELP
    'help-center': {
      title: 'Help & Knowledge Center',
      subtitle: 'Instant Answers to Common Trade and Escrow Questions',
      icon: HelpCircle,
      content: (
        <div className="space-y-4 text-xs">
          <div className="space-y-3">
            <div className="p-3 bg-slate-900 border border-slate-850 rounded-xl">
              <span className="font-bold text-orange-400 block mb-1">Q: How does M-PESA escrow protect my payment?</span>
              <p className="text-slate-400">A: When you fund a milestone, the money is moved from your wallet balance into an isolated trust ledger. The contractor can see the locked funds but cannot access them until you approve the milestone. If workmanship is subpar, you file a dispute to freeze/refund the money.</p>
            </div>
            <div className="p-3 bg-slate-900 border border-slate-850 rounded-xl">
              <span className="font-bold text-orange-400 block mb-1">Q: Are the Tradespeople certified?</span>
              <p className="text-slate-400">A: Yes. All tradespeople on Kazify must undergo physical ID scanning, vocational skill testing (NITA credentials checked), and complete mandatory security training on county bypass avoidance.</p>
            </div>
            <div className="p-3 bg-slate-900 border border-slate-850 rounded-xl">
              <span className="font-bold text-orange-400 block mb-1">Q: Can I withdraw my wallet funds at any time?</span>
              <p className="text-slate-400">A: Yes, any free/unlocked balance in your Kazify wallet can be withdrawn to your M-PESA line instantly.</p>
            </div>
          </div>
        </div>
      )
    },
    'contact': {
      title: 'Contact Customer Support Desk',
      subtitle: '24/7 Helpline & Regional Operations Hubs',
      icon: HelpCircle,
      content: <ContactFormTab />
    }
  };

  const selectedDoc = footerDocs[activeTab] || footerDocs['about-us'];
  const DocIcon = selectedDoc.icon;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className={`w-full max-w-5xl rounded-3xl border shadow-2xl overflow-hidden transition-all duration-300 ${
        darkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
      }`}>
        {/* Modal Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b ${
          darkMode ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center gap-3">
            <div className="bg-orange-500 text-slate-950 p-2.5 rounded-2xl">
              <DocIcon className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-mono font-bold text-orange-500 uppercase tracking-wider">KAZIFY POLICY & KNOWLEDGE CENTER</span>
              <h2 className="text-lg font-bold font-display">{selectedDoc.title}</h2>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-800/10 dark:hover:bg-slate-800 transition duration-150 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="grid grid-cols-1 md:grid-cols-12 min-h-[480px]">
          {/* Navigation Sidebar */}
          <div className={`md:col-span-4 p-4 border-r overflow-y-auto max-h-[500px] space-y-4 ${
            darkMode ? 'bg-slate-950/20 border-slate-800' : 'bg-slate-50/50 border-slate-200'
          }`}>
            {/* ABOUT KAZIFY SECTION */}
            <div>
              <span className="text-[9.5px] font-mono font-bold text-slate-400 uppercase tracking-widest block px-2.5 mb-1.5">ABOUT KAZIFY</span>
              <div className="space-y-0.5 text-xs">
                {[
                  { id: 'about-us', label: 'About Us' },
                  { id: 'refund-policy', label: 'Refunds & Returns' },
                  { id: 'careers', label: 'Careers (Form)' },
                  { id: 'express', label: 'Kazify Express Dispatch' },
                  { id: 'terms', label: 'Terms & Conditions' },
                  { id: 'credit-terms', label: 'Store Credit Guidelines' },
                  { id: 'privacy', label: 'Privacy Notice' },
                  { id: 'cookies', label: 'Cookies Notice' },
                  { id: 'flash-sales', label: 'Flash Sales' }
                ].map(item => (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between transition cursor-pointer ${
                      activeTab === item.id 
                        ? 'bg-orange-500 text-slate-950 font-semibold' 
                        : 'hover:bg-slate-100 dark:hover:bg-slate-850'
                    }`}
                  >
                    <span>{item.label}</span>
                    <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                  </button>
                ))}
              </div>
            </div>

            {/* USEFUL LINKS */}
            <div>
              <span className="text-[9.5px] font-mono font-bold text-slate-400 uppercase tracking-widest block px-2.5 mb-1.5">USEFUL LINKS</span>
              <div className="space-y-0.5 text-xs">
                {[
                  { id: 'track-order', label: 'Track Job Order (Interactive)' },
                  { id: 'shipping', label: 'Logistics & Deliveries' },
                  { id: 'pickup-stations', label: 'Pick-up Stations (Locator)' },
                  { id: 'return-policy', label: 'Material Returns' },
                  { id: 'how-to-order', label: 'How to Order?' },
                  { id: 'dispute-policy', label: 'Dispute Resolution Hub' },
                  { id: 'corporate-bulk', label: 'Corporate Services' },
                  { id: 'advertise', label: 'Advertise with Us' },
                  { id: 'report-product', label: 'Report a Bypass' },
                  { id: 'payment-guidelines', label: 'Payment Guidelines' },
                  { id: 'black-friday', label: 'Black Friday Trade Fest' }
                ].map(item => (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between transition cursor-pointer ${
                      activeTab === item.id 
                        ? 'bg-orange-500 text-slate-950 font-semibold' 
                        : 'hover:bg-slate-100 dark:hover:bg-slate-850'
                    }`}
                  >
                    <span>{item.label}</span>
                    <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                  </button>
                ))}
              </div>
            </div>

            {/* MAKE MONEY WITH KAZIFY */}
            <div>
              <span className="text-[9.5px] font-mono font-bold text-slate-400 uppercase tracking-widest block px-2.5 mb-1.5">MAKE MONEY WITH KAZIFY</span>
              <div className="space-y-0.5 text-xs">
                {[
                  { id: 'sell', label: 'Sell on Kazify (Fundi Reg)' },
                  { id: 'vendor-hub', label: 'Vendor Hub (Hardwares)' },
                  { id: 'consultant', label: 'Become Sales Consultant' },
                  { id: 'order-point', label: 'Become Order Point' }
                ].map(item => (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between transition cursor-pointer ${
                      activeTab === item.id 
                        ? 'bg-orange-500 text-slate-950 font-semibold' 
                        : 'hover:bg-slate-100 dark:hover:bg-slate-850'
                    }`}
                  >
                    <span>{item.label}</span>
                    <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                  </button>
                ))}
              </div>
            </div>

            {/* HELP & CONTACT */}
            <div>
              <span className="text-[9.5px] font-mono font-bold text-slate-400 uppercase tracking-widest block px-2.5 mb-1.5">NEED ASSISTANCE?</span>
              <div className="space-y-0.5 text-xs">
                {[
                  { id: 'help-center', label: 'FAQ Knowledge Base' },
                  { id: 'contact', label: 'Contact Help Desk (Ticket)' }
                ].map(item => (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between transition cursor-pointer ${
                      activeTab === item.id 
                        ? 'bg-orange-500 text-slate-950 font-semibold' 
                        : 'hover:bg-slate-100 dark:hover:bg-slate-850'
                    }`}
                  >
                    <span>{item.label}</span>
                    <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Content Area */}
          <div className="md:col-span-8 p-6 overflow-y-auto max-h-[500px]">
            <div className="space-y-6">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
                <span className="text-xs text-orange-500 font-mono font-bold uppercase tracking-widest block mb-1">
                  {selectedDoc.subtitle}
                </span>
                <h3 className="text-2xl font-bold font-display">{selectedDoc.title}</h3>
              </div>

              {selectedDoc.content}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className={`px-6 py-3 flex flex-col sm:flex-row sm:items-center justify-between text-[11px] font-mono gap-2 border-t ${
          darkMode ? 'bg-slate-950/80 border-slate-800 text-slate-500' : 'bg-slate-50 border-slate-200 text-slate-500'
        }`}>
          <span>Escrow Compliance & Consumer Protection: KAZIFY-REG-47</span>
          <button 
            onClick={onClose}
            className="bg-orange-500 hover:bg-orange-600 text-slate-950 font-bold px-4 py-1.5 rounded-lg text-xs transition duration-150 sm:self-center cursor-pointer"
          >
            Acknowledge & Close Portal
          </button>
        </div>
      </div>
    </div>
  );
}
