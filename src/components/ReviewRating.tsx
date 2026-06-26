import React, { useState } from 'react';
import { Star, Check, Sparkles, HelpCircle, ThumbsUp } from 'lucide-react';

interface ReviewRatingProps {
  onSubmit: (rating: number, comment: string) => Promise<void>;
  isSubmitting: boolean;
  submitButtonText?: string;
  darkMode?: boolean;
}

const PRESET_TAGS = [
  '⚡ Fast arrival',
  '🛠️ High-quality craft',
  '💬 Great communicator',
  '🧼 Cleaned up workspace',
  '🤝 Extremely polite & honest',
  '💰 Fair & transparent pricing',
  '🛡️ Safe & certified work',
  '🔄 Solved issues quickly'
];

export default function ReviewRating({ 
  onSubmit, 
  isSubmitting, 
  submitButtonText = 'Submit Verified Review', 
  darkMode = true 
}: ReviewRatingProps) {
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [comment, setComment] = useState<string>('');
  
  // Sub-ratings state
  const [qualityRating, setQualityRating] = useState<number>(5);
  const [speedRating, setSpeedRating] = useState<number>(5);
  const [commRating, setCommRating] = useState<number>(5);
  
  // Selected quick preset feedback tags
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const getRatingLabel = (score: number) => {
    switch (score) {
      case 1: return { text: 'Disappointing', color: 'text-red-500' };
      case 2: return { text: 'Could be better', color: 'text-orange-400' };
      case 3: return { text: 'Good, acceptable service', color: 'text-amber-500' };
      case 4: return { text: 'Very satisfied', color: 'text-emerald-400' };
      case 5: return { text: 'Outstanding! highly recommended', color: 'text-orange-500' };
      default: return { text: '', color: 'text-slate-400' };
    }
  };

  const handleTagToggle = (tag: string) => {
    let newTags: string[];
    if (selectedTags.includes(tag)) {
      newTags = selectedTags.filter(t => t !== tag);
    } else {
      newTags = [...selectedTags, tag];
    }
    setSelectedTags(newTags);

    // Update the comment text based on tags automatically to help user construct faster
    const baseComment = comment.trim();
    // Filter out previous tags from comment if user toggled them
    let cleanedComment = baseComment;
    PRESET_TAGS.forEach(pt => {
      const tagText = pt.replace(/[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]/g, '').trim();
      cleanedComment = cleanedComment.replace(new RegExp(`\\s*•?\\s*${tagText}\\.?`, 'gi'), '');
    });
    
    cleanedComment = cleanedComment.trim().replace(/^,\s*/, '').replace(/,\s*$/, '');

    // Add selected tags to comments
    const tagTexts = newTags.map(t => t.replace(/[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]/g, '').trim());
    if (tagTexts.length > 0) {
      const tagsSentence = tagTexts.join(', ') + '. ';
      setComment(tagsSentence + (cleanedComment ? cleanedComment : ''));
    } else {
      setComment(cleanedComment);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (comment.trim().length < 5) return;
    
    // Compile custom detailed feedback
    let compiledComment = comment;
    // Append sub-rating summaries if they differ from excellent to provide full data transparency
    const subRatingsSummary = `[Quality: ${qualityRating}/5, Speed: ${speedRating}/5, Communication: ${commRating}/5]`;
    if (!compiledComment.includes(subRatingsSummary)) {
      compiledComment = `${compiledComment.trim()} ${subRatingsSummary}`;
    }

    onSubmit(rating, compiledComment);
  };

  const currentActiveRating = hoverRating !== null ? hoverRating : rating;
  const ratingLabel = getRatingLabel(currentActiveRating);

  return (
    <div id="review-rating-interactive-box" className={`rounded-2xl border p-5 ${
      darkMode 
        ? 'bg-slate-950/80 border-slate-800 text-slate-100' 
        : 'bg-white border-slate-200 text-slate-900 shadow-sm'
    }`}>
      <form onSubmit={handleSubmit} className="space-y-5">
        
        {/* Main Star Selection */}
        <div className="text-center space-y-2">
          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block font-bold">Overall Star Rating</span>
          
          <div className="flex justify-center items-center space-x-1.5">
            {[1, 2, 3, 4, 5].map((stars) => (
              <button
                key={stars}
                type="button"
                onMouseEnter={() => setHoverRating(stars)}
                onMouseLeave={() => setHoverRating(null)}
                onClick={() => setRating(stars)}
                className="p-1 focus:outline-none transition transform hover:scale-115 active:scale-95 cursor-pointer"
                id={`rating-star-btn-${stars}`}
              >
                <Star 
                  className={`w-8 h-8 transition-all ${
                    stars <= currentActiveRating 
                      ? 'text-amber-400 fill-amber-400 drop-shadow-[0_0_4px_rgba(251,191,36,0.3)]' 
                      : (darkMode ? 'text-slate-800' : 'text-slate-200')
                  }`} 
                />
              </button>
            ))}
          </div>

          <p className={`text-xs font-mono font-bold ${ratingLabel.color} min-h-[16px] animate-pulse`}>
            {ratingLabel.text}
          </p>
        </div>

        {/* Detailed Performance Metrics */}
        <div className={`p-4 rounded-xl border space-y-3.5 ${
          darkMode ? 'bg-slate-900/40 border-slate-850' : 'bg-slate-50/50 border-slate-100'
        }`}>
          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block font-bold">Performance Breakdown</span>
          
          {/* Quality */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 font-mono">Work Quality:</span>
            <div className="flex items-center space-x-1">
              {[1, 2, 3, 4, 5].map(s => (
                <button
                  type="button"
                  key={s}
                  onClick={() => setQualityRating(s)}
                  className="p-0.5 hover:scale-110 transition cursor-pointer"
                >
                  <Star className={`w-3.5 h-3.5 ${s <= qualityRating ? 'text-amber-500 fill-amber-500' : 'text-slate-800'}`} />
                </button>
              ))}
              <span className="text-[10px] font-mono font-bold text-orange-400 w-8 text-right">({qualityRating}/5)</span>
            </div>
          </div>

          {/* Speed */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 font-mono">Arrival & Speed:</span>
            <div className="flex items-center space-x-1">
              {[1, 2, 3, 4, 5].map(s => (
                <button
                  type="button"
                  key={s}
                  onClick={() => setSpeedRating(s)}
                  className="p-0.5 hover:scale-110 transition cursor-pointer"
                >
                  <Star className={`w-3.5 h-3.5 ${s <= speedRating ? 'text-amber-500 fill-amber-500' : 'text-slate-800'}`} />
                </button>
              ))}
              <span className="text-[10px] font-mono font-bold text-orange-400 w-8 text-right">({speedRating}/5)</span>
            </div>
          </div>

          {/* Communication */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 font-mono">Communication:</span>
            <div className="flex items-center space-x-1">
              {[1, 2, 3, 4, 5].map(s => (
                <button
                  type="button"
                  key={s}
                  onClick={() => setCommRating(s)}
                  className="p-0.5 hover:scale-110 transition cursor-pointer"
                >
                  <Star className={`w-3.5 h-3.5 ${s <= commRating ? 'text-amber-500 fill-amber-500' : 'text-slate-800'}`} />
                </button>
              ))}
              <span className="text-[10px] font-mono font-bold text-orange-400 w-8 text-right">({commRating}/5)</span>
            </div>
          </div>
        </div>

        {/* Quick Tag Recommendations */}
        <div className="space-y-2 text-left">
          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block font-bold">Quick Feedback Tags (Select to add)</span>
          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
            {PRESET_TAGS.map((tag) => {
              const isSelected = selectedTags.includes(tag);
              return (
                <button
                  type="button"
                  key={tag}
                  onClick={() => handleTagToggle(tag)}
                  className={`px-2.5 py-1 text-[10px] font-mono rounded-lg border transition-all cursor-pointer flex items-center space-x-1 ${
                    isSelected
                      ? 'bg-orange-500/15 border-orange-500 text-orange-400 font-bold'
                      : (darkMode 
                          ? 'bg-slate-900 border-slate-850 text-slate-400 hover:text-slate-200' 
                          : 'bg-slate-50 border-slate-100 text-slate-600 hover:text-slate-950')
                  }`}
                >
                  <span>{tag}</span>
                  {isSelected && <Check className="w-3 h-3 text-orange-400" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Written Review */}
        <div className="space-y-1.5 text-left">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block font-bold">Detailed client comments</span>
            <span className={`text-[10px] font-mono ${comment.trim().length >= 5 ? 'text-slate-500' : 'text-orange-400 font-bold'}`}>
              {comment.trim().length}/300 chars (min 5)
            </span>
          </div>

          <textarea
            rows={3}
            value={comment}
            onChange={(e) => setComment(e.target.value.slice(0, 300))}
            placeholder="Tell other Kenyan customers about their craftsmanship, neatness, timeliness..."
            className={`w-full text-xs font-mono rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-orange-500/10 resize-none ${
              darkMode
                ? 'bg-slate-900 border border-slate-800 text-white placeholder:text-slate-650 focus:border-orange-500'
                : 'bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-orange-500'
            }`}
            required
            id="review-comment-textarea"
          />
        </div>

        {/* Submit Action */}
        <button
          type="submit"
          disabled={isSubmitting || comment.trim().length < 5}
          className="w-full py-3 bg-orange-500 hover:bg-orange-400 disabled:bg-slate-800 disabled:text-slate-600 text-slate-950 font-bold rounded-xl text-xs transition duration-200 flex items-center justify-center space-x-2 cursor-pointer disabled:cursor-not-allowed disabled:transform-none transform hover:-translate-y-0.5 active:translate-y-0 shadow-lg shadow-orange-500/10"
          id="submit-verified-review-btn"
        >
          {isSubmitting ? (
            <div className="flex items-center space-x-2">
              <div className="w-3.5 h-3.5 rounded-full border border-slate-950 border-t-transparent animate-spin"></div>
              <span>Securing Review on Chain...</span>
            </div>
          ) : (
            <>
              <ThumbsUp className="w-3.5 h-3.5 text-slate-950" />
              <span>{submitButtonText}</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
