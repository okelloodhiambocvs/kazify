import React, { useEffect } from 'react';

interface HelmetProps {
  title: string;
  description?: string;
}

export const Helmet: React.FC<HelmetProps> = ({ title, description }) => {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = title ? `${title} | Kazify - Handyman Escrow & AI Estimation` : "Kazify - Handyman Escrow & AI Estimation";

    let metaDescription = document.querySelector('meta[name="description"]');
    let created = false;

    if (!metaDescription) {
      metaDescription = document.createElement('meta');
      metaDescription.setAttribute('name', 'description');
      document.head.appendChild(metaDescription);
      created = true;
    }

    const prevDescription = metaDescription.getAttribute('content') || '';
    metaDescription.setAttribute(
      'content',
      description || "Kazify connects you with verified local handymen (Fundis) with secure, automated escrow payouts and fair price estimations driven by Gemini AI."
    );

    return () => {
      document.title = prevTitle;
      if (metaDescription) {
        if (created) {
          metaDescription.remove();
        } else {
          metaDescription.setAttribute('content', prevDescription);
        }
      }
    };
  }, [title, description]);

  return null;
};
