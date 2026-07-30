import React, { useState } from 'react';
import FooterModal from '../FooterModal';

interface CTAProps {
  darkMode: boolean;
}

export const CTA: React.FC<CTAProps> = ({ darkMode }) => {
  const [footerModalOpen, setFooterModalOpen] = useState(false);
  const [activeFooterTab, setActiveFooterTab] = useState('about-us');

  const openFooterTab = (tab: string) => {
    setActiveFooterTab(tab);
    setFooterModalOpen(true);
  };

  return (
    <>
      <footer role="contentinfo" className={`mt-auto py-12 border-t transition-colors duration-300 ${
        darkMode ? 'bg-slate-950 text-slate-300 border-slate-900' : 'bg-slate-900 text-slate-100 border-slate-800'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-10 text-left">
            {/* ABOUT KAZIFY */}
            <div id="footer-about-kazify-col" role="region" aria-label="About Kazify Links">
              <h3 className="text-sm font-bold tracking-wider text-orange-500 uppercase mb-4">ABOUT KAZIFY</h3>
              <nav aria-label="About Kazify Navigation">
                <ul className="space-y-2 text-xs">
                  <li><button onClick={() => openFooterTab('about-us')} className="hover:text-white transition-colors duration-200 cursor-pointer text-left block w-full focus-visible:ring-2 focus-visible:ring-orange-500 focus:outline-none" aria-label="About us">About us</button></li>
                  <li><button onClick={() => openFooterTab('refund-policy')} className="hover:text-white transition-colors duration-200 cursor-pointer text-left block w-full focus-visible:ring-2 focus-visible:ring-orange-500 focus:outline-none" aria-label="Returns and Refunds Policy">Returns and Refunds Policy</button></li>
                  <li><button onClick={() => openFooterTab('careers')} className="hover:text-white transition-colors duration-200 cursor-pointer text-left block w-full focus-visible:ring-2 focus-visible:ring-orange-500 focus:outline-none" aria-label="Kazify Careers">Kazify Careers</button></li>
                  <li><button onClick={() => openFooterTab('express')} className="hover:text-white transition-colors duration-200 cursor-pointer text-left block w-full focus-visible:ring-2 focus-visible:ring-orange-500 focus:outline-none" aria-label="Kazify Express">Kazify Express</button></li>
                  <li><button onClick={() => openFooterTab('terms')} className="hover:text-white transition-colors duration-200 cursor-pointer text-left block w-full focus-visible:ring-2 focus-visible:ring-orange-500 focus:outline-none" aria-label="Terms and Conditions">Terms and Conditions</button></li>
                  <li><button onClick={() => openFooterTab('credit-terms')} className="hover:text-white transition-colors duration-200 cursor-pointer text-left block w-full focus-visible:ring-2 focus-visible:ring-orange-500 focus:outline-none" aria-label="Store Credit Terms and Conditions">Store Credit Terms and Conditions</button></li>
                  <li><button onClick={() => openFooterTab('privacy')} className="hover:text-white transition-colors duration-200 cursor-pointer text-left block w-full focus-visible:ring-2 focus-visible:ring-orange-500 focus:outline-none" aria-label="Privacy Notice">Privacy Notice</button></li>
                  <li><button onClick={() => openFooterTab('cookies')} className="hover:text-white transition-colors duration-200 cursor-pointer text-left block w-full focus-visible:ring-2 focus-visible:ring-orange-500 focus:outline-none" aria-label="Cookies Notice">Cookies Notice</button></li>
                  <li><button onClick={() => openFooterTab('flash-sales')} className="hover:text-white transition-colors duration-200 cursor-pointer text-left block w-full focus-visible:ring-2 focus-visible:ring-orange-500 focus:outline-none" aria-label="Flash Sales">Flash Sales</button></li>
                </ul>
              </nav>
            </div>

            {/* USEFUL LINKS */}
            <div id="footer-useful-links-col" role="region" aria-label="Useful Links">
              <h3 className="text-sm font-bold tracking-wider text-orange-500 uppercase mb-4">USEFUL LINKS</h3>
              <nav aria-label="Useful Links Navigation">
                <ul className="space-y-2 text-xs">
                  <li><button onClick={() => openFooterTab('track-order')} className="hover:text-white transition-colors duration-200 cursor-pointer text-left block w-full focus-visible:ring-2 focus-visible:ring-orange-500 focus:outline-none" aria-label="Track Your Order">Track Your Order</button></li>
                  <li><button onClick={() => openFooterTab('shipping')} className="hover:text-white transition-colors duration-200 cursor-pointer text-left block w-full focus-visible:ring-2 focus-visible:ring-orange-500 focus:outline-none" aria-label="Shipping and delivery guidelines">Shipping and delivery</button></li>
                  <li><button onClick={() => openFooterTab('pickup-stations')} className="hover:text-white transition-colors duration-200 cursor-pointer text-left block w-full focus-visible:ring-2 focus-visible:ring-orange-500 focus:outline-none" aria-label="Pick-up Stations">Pick-up Stations</button></li>
                  <li><button onClick={() => openFooterTab('return-policy')} className="hover:text-white transition-colors duration-200 cursor-pointer text-left block w-full focus-visible:ring-2 focus-visible:ring-orange-500 focus:outline-none" aria-label="Return Policy">Return Policy</button></li>
                  <li><button onClick={() => openFooterTab('how-to-order')} className="hover:text-white transition-colors duration-200 cursor-pointer text-left block w-full focus-visible:ring-2 focus-visible:ring-orange-500 focus:outline-none" aria-label="How to Order">How to Order?</button></li>
                  <li><button onClick={() => openFooterTab('dispute-policy')} className="hover:text-white transition-colors duration-200 cursor-pointer text-left block w-full focus-visible:ring-2 focus-visible:ring-orange-500 focus:outline-none" aria-label="Dispute Resolution Policy">Dispute Resolution Policy</button></li>
                  <li><button onClick={() => openFooterTab('corporate-bulk')} className="hover:text-white transition-colors duration-200 cursor-pointer text-left block w-full focus-visible:ring-2 focus-visible:ring-orange-500 focus:outline-none" aria-label="Corporate and Bulk Purchase">Corporate and Bulk Purchase</button></li>
                  <li><button onClick={() => openFooterTab('advertise')} className="hover:text-white transition-colors duration-200 cursor-pointer text-left block w-full focus-visible:ring-2 focus-visible:ring-orange-500 focus:outline-none" aria-label="Advertise with Kazify">Advertise with Kazify</button></li>
                  <li><button onClick={() => openFooterTab('report-product')} className="hover:text-white transition-colors duration-200 cursor-pointer text-left block w-full focus-visible:ring-2 focus-visible:ring-orange-500 focus:outline-none" aria-label="Report a Product">Report a Product</button></li>
                  <li><button onClick={() => openFooterTab('payment-guidelines')} className="hover:text-white transition-colors duration-200 cursor-pointer text-left block w-full focus-visible:ring-2 focus-visible:ring-orange-500 focus:outline-none" aria-label="Kazify Payment Information Guidelines">Kazify Payment Information Guidelines</button></li>
                  <li><button onClick={() => openFooterTab('black-friday')} className="hover:text-white transition-colors duration-200 cursor-pointer text-left block w-full focus-visible:ring-2 focus-visible:ring-orange-500 focus:outline-none" aria-label="Black Friday Promos">Black Friday</button></li>
                </ul>
              </nav>
            </div>

            {/* MAKE MONEY WITH KAZIFY */}
            <div id="footer-make-money-col" role="region" aria-label="Earn with Kazify">
              <h3 className="text-sm font-bold tracking-wider text-orange-500 uppercase mb-4">MAKE MONEY WITH KAZIFY</h3>
              <nav aria-label="Earnings Navigation">
                <ul className="space-y-2 text-xs">
                  <li><button onClick={() => openFooterTab('sell')} className="hover:text-white transition-colors duration-200 cursor-pointer text-left block w-full focus-visible:ring-2 focus-visible:ring-orange-500 focus:outline-none" aria-label="Sell your services on Kazify">Sell on Kazify</button></li>
                  <li><button onClick={() => openFooterTab('vendor-hub')} className="hover:text-white transition-colors duration-200 cursor-pointer text-left block w-full focus-visible:ring-2 focus-visible:ring-orange-500 focus:outline-none" aria-label="Vendor Hub log in">Vendor Hub</button></li>
                  <li><button onClick={() => openFooterTab('consultant')} className="hover:text-white transition-colors duration-200 cursor-pointer text-left block w-full focus-visible:ring-2 focus-visible:ring-orange-500 focus:outline-none" aria-label="Become a Sales Consultant">Become a Sales Consultant</button></li>
                  <li><button onClick={() => openFooterTab('order-point')} className="hover:text-white transition-colors duration-200 cursor-pointer text-left block w-full focus-visible:ring-2 focus-visible:ring-orange-500 focus:outline-none" aria-label="Become A Kazify Order Point">Become A Kazify Order Point</button></li>
                </ul>
              </nav>
            </div>

            {/* NEED HELP? Chat with us */}
            <div id="footer-help-col" role="region" aria-label="Customer Support Contact">
              <h3 className="text-sm font-bold tracking-wider text-orange-500 uppercase mb-4">NEED HELP? Chat with us</h3>
              <ul className="space-y-3 text-xs">
                <li><button onClick={() => openFooterTab('help-center')} className="hover:text-white transition-colors duration-200 font-medium bg-orange-500 text-slate-950 px-3 py-1.5 rounded-md inline-block mb-1 cursor-pointer focus-visible:ring-2 focus-visible:ring-orange-500 focus:outline-none text-center" aria-label="Visit Kazify Help Center">Help Center</button></li>
                <li className="flex flex-col space-y-1">
                  <span className="text-slate-400">Contact Us Via:</span>
                  <a href="tel:+254786692381" className="text-sm font-bold hover:text-orange-400 transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-orange-500 focus:outline-none" aria-label="Call Kazify Support phone">+254 786 692 381</a>
                </li>
                <li className="flex flex-col space-y-1">
                  <span className="text-slate-400">Visit Us:</span>
                  <span className="font-semibold text-white">Kisumu, Obotte Road</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-slate-800 pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 font-mono gap-4">
            <p>Copyright © 2026 KAZIFY Marketplace. All rights reserved.</p>
            <div className="flex space-x-4">
              <span>National Operations Support: All 47 Counties in Kenya</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Interactive Footer Modal for Help and Policies */}
      <FooterModal 
        isOpen={footerModalOpen} 
        onClose={() => setFooterModalOpen(false)} 
        activeTab={activeFooterTab} 
        darkMode={darkMode} 
      />
    </>
  );
};
