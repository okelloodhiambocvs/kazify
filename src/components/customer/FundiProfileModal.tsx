import React from 'react';
import { Star, Calendar } from 'lucide-react';
import BookingCalendar from '../BookingCalendar';
import ReviewRating from '../ReviewRating';

interface FundiProfileModalProps {
  showProfileModal: boolean;
  setShowProfileModal: (show: boolean) => void;
  profileLoading: boolean;
  profileData: any | null;
  profileFundiId: string | null;
  selectedBookingDate: string;
  setSelectedBookingDate: (dateStr: string) => void;
  isSubmittingProfileReview: boolean;
  handleProfileReviewSubmit: (rating: number, comment: string) => Promise<void>;
}

export default function FundiProfileModal({
  showProfileModal,
  setShowProfileModal,
  profileLoading,
  profileData,
  profileFundiId,
  selectedBookingDate,
  setSelectedBookingDate,
  isSubmittingProfileReview,
  handleProfileReviewSubmit
}: FundiProfileModalProps) {
  if (!showProfileModal) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] text-left">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex justify-between items-start bg-slate-950/40">
          <div>
            <span className="text-[10px] text-orange-500 font-bold uppercase tracking-wider font-mono block mb-1">SKILLED TRADESMAN PROFILE</span>
            <h3 className="text-xl font-bold font-display text-white" id="modal-fundi-name">
              {profileLoading ? 'Loading profile...' : profileData?.fundi?.name || 'Tradesperson'}
            </h3>
            {!profileLoading && profileData?.fundi && (
              <div className="flex items-center space-x-2 mt-1.5">
                <span className="px-2 py-0.5 rounded bg-orange-500/10 text-orange-400 border border-orange-500/20 text-[10px] font-bold font-mono">
                  {profileData.fundi.category} Expert
                </span>
                <span className="text-xs text-slate-400">• Vetted & Approved</span>
              </div>
            )}
          </div>
          <button
            onClick={() => setShowProfileModal(false)}
            className="p-1 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer text-xs font-mono border border-slate-700"
          >
            Close
          </button>
        </div>

        {/* Scrollable Container */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {profileLoading ? (
            <div className="py-12 text-center text-slate-500 font-mono text-xs flex flex-col items-center">
              <div className="w-8 h-8 rounded-full border-2 border-orange-500 border-t-transparent animate-spin mb-3"></div>
              Retrieving trusted statistics & history...
            </div>
          ) : profileData ? (
            <>
              {/* Overview Panel / Trust Box */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-850 text-center flex flex-col justify-center">
                  <span className="text-[9px] text-slate-500 font-mono block font-bold uppercase mb-1">SCORE</span>
                  <div className="flex items-center justify-center space-x-1">
                    <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                    <span className="text-lg font-bold text-white font-display">{profileData.fundi.rating?.toFixed(1) || '0.0'}</span>
                  </div>
                  <span className="text-[9px] text-slate-500 block font-mono mt-1">out of 5.0</span>
                </div>

                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-850 text-center flex flex-col justify-center">
                  <span className="text-[9px] text-slate-500 font-mono block font-bold uppercase mb-1">JOBS COMPLETED</span>
                  <span className="text-lg font-bold text-white font-display">{profileData.stats.completed_jobs}</span>
                  <span className="text-[9px] text-emerald-400 block font-mono">100% verified</span>
                </div>

                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-850 text-center flex flex-col justify-center">
                  <span className="text-[9px] text-slate-500 font-mono block font-bold uppercase mb-1">FEEDBACKS</span>
                  <span className="text-lg font-bold text-orange-400 font-display">{profileData.stats.total_reviews}</span>
                  <span className="text-[9px] text-slate-500 block font-mono">Reviews logged</span>
                </div>
              </div>

              {/* Rating Distribution Grid */}
              <div className="bg-slate-950/40 p-4 rounded-2xl border border-slate-850 space-y-2">
                <span className="text-[10px] text-slate-400 font-mono font-bold block mb-2">RATING BREAKDOWN</span>
                {[5, 4, 3, 2, 1].map((stars) => {
                  const count = profileData.stats.rating_distribution[stars.toString()] || 0;
                  const total = profileData.stats.total_reviews || 1;
                  const pct = Math.round((count / total) * 100);
                  return (
                    <div key={stars} className="flex items-center text-xs text-slate-400 font-mono">
                      <span className="w-8">{stars} ★</span>
                      <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden mx-3">
                        <div className="h-full bg-amber-500" style={{ width: `${pct}%` }}></div>
                      </div>
                      <span className="w-8 text-right text-[11px] font-semibold text-slate-300">{count}</span>
                    </div>
                  );
                })}
              </div>

              {/* Availability Booking Calendar for Clients */}
              <div className="space-y-3 bg-slate-950/40 p-4 rounded-2xl border border-slate-850">
                <span className="text-[10px] font-mono text-slate-400 font-bold block uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-orange-400" />
                  BOOKING AVAILABILITY CALENDAR
                </span>
                <BookingCalendar 
                  fundiId={profileFundiId || ''} 
                  isEditable={false} 
                  selectedDate={selectedBookingDate}
                  onDateSelected={(dateStr) => {
                    setSelectedBookingDate(dateStr);
                  }}
                />
                {selectedBookingDate && (
                  <div className="p-3 bg-orange-500/10 border border-orange-500/20 rounded-xl flex flex-col gap-1 text-left animate-in fade-in slide-in-from-bottom-2">
                    <span className="text-[10px] font-mono font-bold text-orange-400 uppercase">PROPOSED DATE SELECTED</span>
                    <p className="text-[11px] text-slate-300 font-mono">
                      You selected <strong className="text-white">{new Date(selectedBookingDate).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</strong>. Propose this date in chat to book this expert!
                    </p>
                  </div>
                )}
              </div>

              {/* Customer Review chronological feed */}
              <div className="space-y-3">
                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block font-bold">CUSTOMER LOGGED REVIEWS ({profileData.reviews.length})</span>
                {profileData.reviews.length === 0 ? (
                  <p className="text-xs text-slate-500 italic py-3 text-center border border-dashed border-slate-850 rounded-xl font-mono">No feedback reviews logged yet for this tradesperson.</p>
                ) : (
                  <div className="space-y-3">
                    {profileData.reviews.map((rev: any) => (
                      <div key={rev.id} className="p-4 rounded-2xl bg-slate-950/50 border border-slate-850 text-xs text-left">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-semibold text-white">{rev.customer_name}</span>
                          <span className="text-[10px] text-slate-500 font-mono">{new Date(rev.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                        </div>
                        <div className="flex items-center text-amber-500 space-x-0.5 mb-2">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star 
                              key={i} 
                              className={`w-3.5 h-3.5 ${i < rev.rating ? 'fill-amber-500 text-amber-500' : 'text-slate-800'}`} 
                            />
                          ))}
                        </div>
                        <p className="text-slate-300 leading-relaxed italic font-mono">"{rev.comment}"</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Independent Review Box inside the profile modal */}
              <div className="space-y-2">
                <div className="border-t border-slate-800 pt-4 mt-2">
                  <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block font-bold mb-3">Leave Profile Feedback</span>
                  <ReviewRating 
                    isSubmitting={isSubmittingProfileReview}
                    submitButtonText="Post Profile Feedback"
                    onSubmit={async (rating, comment) => {
                      await handleProfileReviewSubmit(rating, comment);
                    }}
                  />
                </div>
              </div>
            </>
          ) : (
            <div className="py-6 text-center text-red-400 text-xs font-mono">
              Error retrieving tradesman details. Please retry.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/20 text-center">
          <p className="text-[10px] text-slate-500 font-mono leading-relaxed">
            Review scores are fully secured by M-Pesa escrow verification tags to maintain high trust values.
          </p>
        </div>

      </div>
    </div>
  );
}
