import { useState } from 'react';
import { User } from '../../types';
import api from '../../services/api';

export function useFundiProfileModal(user: User) {
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileFundiId, setProfileFundiId] = useState<string | null>(null);
  const [profileData, setProfileData] = useState<any | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [selectedBookingDate, setSelectedBookingDate] = useState<string>('');
  
  const [profileReviewRating, setProfileReviewRating] = useState(5);
  const [profileReviewComment, setProfileReviewComment] = useState('');
  const [isSubmittingProfileReview, setIsSubmittingProfileReview] = useState(false);

  const handleOpenProfileModal = async (fundiId: string) => {
    setProfileFundiId(fundiId);
    setShowProfileModal(true);
    setProfileLoading(true);
    setProfileData(null);
    setProfileReviewComment('');
    setProfileReviewRating(5);
    setSelectedBookingDate('');
    try {
      const res = await api.get(`/api/fundis/${fundiId}/profile`);
      setProfileData(res.data);
    } catch (e) {
      console.error('Failed to fetch fundi profile attributes', e);
    } finally {
      setProfileLoading(false);
    }
  };

  const handleProfileReviewSubmit = async (rating: number, comment: string) => {
    if (!profileFundiId) return;
    setIsSubmittingProfileReview(true);
    try {
      await api.post('/api/reviews', {
        fundi_id: profileFundiId,
        customer_id: user.id,
        customer_name: user.name,
        rating: rating,
        comment: comment
      });
      const res = await api.get(`/api/fundis/${profileFundiId}/profile`);
      setProfileData(res.data);
      setProfileReviewComment('');
      setProfileReviewRating(5);
    } catch (e) {
      console.error('Failed to submit review', e);
    } finally {
      setIsSubmittingProfileReview(false);
    }
  };

  return {
    showProfileModal,
    setShowProfileModal,
    profileFundiId,
    profileData,
    profileLoading,
    selectedBookingDate,
    setSelectedBookingDate,
    profileReviewRating,
    setProfileReviewRating,
    profileReviewComment,
    setProfileReviewComment,
    isSubmittingProfileReview,
    handleOpenProfileModal,
    handleProfileReviewSubmit
  };
}
