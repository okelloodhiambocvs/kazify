import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, Clock, Check, AlertCircle, 
  ChevronLeft, ChevronRight, Lock, Sparkles, CheckCircle, Info 
} from 'lucide-react';
import api from '../services/api';

interface WorkingHours {
  start: string;
  end: string;
  activeDays: string[];
}

interface Availability {
  workingHours: WorkingHours;
  unavailableDates: string[];
}

interface BookingCalendarProps {
  fundiId: string;
  isEditable: boolean; // true for Fundi editing, false for Client booking
  onDateSelected?: (dateStr: string) => void;
  selectedDate?: string;
}

const DAYS_OF_WEEK = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function BookingCalendar({ fundiId, isEditable, onDateSelected, selectedDate }: BookingCalendarProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Availability State
  const [workingHours, setWorkingHours] = useState<WorkingHours>({
    start: "08:00",
    end: "17:00",
    activeDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
  });
  const [unavailableDates, setUnavailableDates] = useState<string[]>([]);

  // Navigation state for the visual calendar grid
  const [currentDate, setCurrentDate] = useState(new Date());

  // Load availability
  useEffect(() => {
    const fetchAvailability = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/api/users/${fundiId}/availability`);
        if (res.data) {
          if (res.data.workingHours) {
            setWorkingHours(res.data.workingHours);
          }
          if (res.data.unavailableDates) {
            setUnavailableDates(res.data.unavailableDates);
          }
        }
        setError('');
      } catch (err: any) {
        console.error('Failed to load availability', err);
        setError('Could not retrieve tradesperson schedule settings.');
      } finally {
        setLoading(false);
      }
    };

    fetchAvailability();
  }, [fundiId]);

  // Save changes (Fundi only)
  const handleSaveAvailability = async () => {
    try {
      setSuccess('');
      setError('');
      const res = await api.post(`/api/users/${fundiId}/availability`, {
        workingHours,
        unavailableDates
      });
      if (res.data.success) {
        setSuccess('Schedule & booking preferences saved successfully!');
        setTimeout(() => setSuccess(''), 4000);
      }
    } catch (err: any) {
      console.error('Failed to save availability', err);
      setError(err.response?.data?.error || 'Unable to update availability schedule.');
    }
  };

  // Calendar calculations
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthName = currentDate.toLocaleString('default', { month: 'long' });

  const daysInMonth = useMemo(() => {
    return new Date(year, month + 1, 0).getDate();
  }, [year, month]);

  const firstDayIndex = useMemo(() => {
    return new Date(year, month, 1).getDay();
  }, [year, month]);

  // Toggle day available/unavailable (Fundi only)
  const handleDayClick = (dayNum: number) => {
    // Format to YYYY-MM-DD (local date representation to avoid timezone shifts)
    const formattedDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    
    if (isEditable) {
      setUnavailableDates((prev) => {
        if (prev.includes(formattedDate)) {
          return prev.filter(d => d !== formattedDate);
        } else {
          return [...prev, formattedDate];
        }
      });
    } else {
      // Client mode: Check if day is actually available
      const dayOfWeekName = DAYS_OF_WEEK[new Date(year, month, dayNum).getDay()];
      const isWorkingDay = workingHours.activeDays.includes(dayOfWeekName);
      const isBlocked = unavailableDates.includes(formattedDate);
      
      if (isWorkingDay && !isBlocked) {
        if (onDateSelected) {
          onDateSelected(formattedDate);
        }
      }
    }
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const toggleWeekday = (day: string) => {
    if (!isEditable) return;
    setWorkingHours(prev => {
      const activeDays = prev.activeDays.includes(day)
        ? prev.activeDays.filter(d => d !== day)
        : [...prev.activeDays, day];
      return { ...prev, activeDays };
    });
  };

  if (loading) {
    return (
      <div className="p-6 text-center text-slate-500 font-mono text-xs flex flex-col items-center justify-center gap-2">
        <div className="w-5 h-5 border-2 border-t-orange-500 border-slate-800 rounded-full animate-spin" />
        <span>Syncing dispatcher calendar records...</span>
      </div>
    );
  }

  return (
    <div className="p-5 bg-slate-950/80 border border-slate-800/80 rounded-2xl space-y-4 shadow-xl" id={`booking-calendar-${fundiId}`}>
      {/* Messages */}
      {error && (
        <div className="p-2.5 bg-red-500/10 border border-red-500/20 rounded-xl text-[10px] text-red-400 font-mono flex items-center gap-1.5 animate-in fade-in">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-[10px] text-emerald-400 font-mono flex items-center gap-1.5 animate-in fade-in">
          <Check className="w-3.5 h-3.5 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
        {/* Left column: Working hours and active weekdays config */}
        <div className="md:col-span-5 space-y-4 text-left">
          <div className="space-y-1.5">
            <span className="text-[10px] font-mono font-bold text-orange-400 uppercase tracking-widest block flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              Working Hours
            </span>
            <p className="text-[10px] text-slate-500 leading-normal font-sans">
              {isEditable 
                ? "Configure your daily active timeline and operating days to get dispatched accurately."
                : "Standard service shift of this expert. Booking inquiries conform to these periods."}
            </p>
          </div>

          {/* Start & End pickers */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[9px] font-mono text-slate-400 uppercase block mb-1">Shift Start</label>
              <select
                disabled={!isEditable}
                value={workingHours.start}
                onChange={(e) => setWorkingHours(prev => ({ ...prev, start: e.target.value }))}
                className="w-full rounded-xl px-2.5 py-1.5 text-xs font-mono bg-slate-900 border border-slate-800 text-white disabled:opacity-75 focus:outline-none focus:border-orange-500"
              >
                {Array.from({ length: 24 }).map((_, i) => {
                  const hour = String(i).padStart(2, '0') + ":00";
                  return <option key={hour} value={hour}>{hour}</option>;
                })}
              </select>
            </div>
            <div>
              <label className="text-[9px] font-mono text-slate-400 uppercase block mb-1">Shift End</label>
              <select
                disabled={!isEditable}
                value={workingHours.end}
                onChange={(e) => setWorkingHours(prev => ({ ...prev, end: e.target.value }))}
                className="w-full rounded-xl px-2.5 py-1.5 text-xs font-mono bg-slate-900 border border-slate-800 text-white disabled:opacity-75 focus:outline-none focus:border-orange-500"
              >
                {Array.from({ length: 24 }).map((_, i) => {
                  const hour = String(i).padStart(2, '0') + ":00";
                  return <option key={hour} value={hour}>{hour}</option>;
                })}
              </select>
            </div>
          </div>

          {/* Weekdays Toggle Grid */}
          <div className="space-y-2">
            <span className="text-[9px] font-mono text-slate-400 uppercase block">Operating Days</span>
            <div className="flex flex-wrap gap-1.5">
              {DAYS_OF_WEEK.map((day) => {
                const isActive = workingHours.activeDays.includes(day);
                const shortLabel = day.substring(0, 3);
                return (
                  <button
                    key={day}
                    type="button"
                    disabled={!isEditable}
                    onClick={() => toggleWeekday(day)}
                    className={`px-2.5 py-1 text-[9px] font-mono font-bold rounded-lg border cursor-pointer transition ${
                      isActive 
                        ? 'bg-orange-500/15 text-orange-400 border-orange-500/30' 
                        : 'bg-slate-900 text-slate-500 border-slate-800 hover:text-slate-400'
                    }`}
                  >
                    {shortLabel.toUpperCase()}
                  </button>
                );
              })}
            </div>
          </div>

          {isEditable && (
            <button
              type="button"
              onClick={handleSaveAvailability}
              className="w-full py-2 bg-orange-500 hover:bg-orange-400 text-slate-950 rounded-xl text-xs font-mono font-bold transition cursor-pointer"
            >
              SAVE SCHEDULE PREFERENCES
            </button>
          )}

          {!isEditable && (
            <div className="p-3 bg-slate-900/50 border border-slate-800 rounded-xl flex items-start gap-2">
              <Info className="w-3.5 h-3.5 text-orange-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5 text-[9px] font-mono text-slate-400 leading-relaxed">
                <span className="text-white block font-bold uppercase mb-0.5">How to Booking:</span>
                <span>Select an available day styled in <strong className="text-emerald-400 font-bold">Green</strong> on the calendar, then propose an appointment slot directly in client chats!</span>
              </div>
            </div>
          )}
        </div>

        {/* Right column: Interactive grid calendar */}
        <div className="md:col-span-7 space-y-3">
          <div className="flex justify-between items-center bg-slate-900 px-3.5 py-2 rounded-xl border border-slate-800">
            <span className="text-xs font-mono font-bold text-slate-200">
              {monthName.toUpperCase()} {year}
            </span>
            <div className="flex items-center space-x-1">
              <button 
                type="button" 
                onClick={handlePrevMonth}
                className="p-1 hover:text-white text-slate-500 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button 
                type="button" 
                onClick={handleNextMonth}
                className="p-1 hover:text-white text-slate-500 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Grid header: Sun to Sat */}
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-mono text-slate-500 font-bold">
            {DAYS_SHORT.map((day) => (
              <div key={day} className="py-1">{day}</div>
            ))}
          </div>

          {/* Grid body */}
          <div className="grid grid-cols-7 gap-1.5">
            {/* Empty cells before first day */}
            {Array.from({ length: firstDayIndex }).map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square bg-transparent rounded-lg" />
            ))}

            {/* Days list */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const formattedDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
              
              const dayOfWeekIndex = (firstDayIndex + i) % 7;
              const dayOfWeekName = DAYS_OF_WEEK[dayOfWeekIndex];
              const isWorkingDay = workingHours.activeDays.includes(dayOfWeekName);
              const isBlocked = unavailableDates.includes(formattedDate);
              const isSelected = selectedDate === formattedDate;

              // Compute color and styling
              let cellClass = "bg-slate-900 border border-slate-800 text-slate-400 hover:border-slate-600";
              let badgeElement = null;

              if (isEditable) {
                // Fundi Mode:
                // Show if blocked, otherwise active
                if (isBlocked) {
                  cellClass = "bg-red-500/10 border border-red-500/30 text-red-400 hover:border-red-500 cursor-pointer relative";
                  badgeElement = <span className="absolute bottom-0.5 right-0.5 text-[6px] font-mono text-red-500 font-bold uppercase">Blocked</span>;
                } else if (isWorkingDay) {
                  cellClass = "bg-emerald-500/5 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500 cursor-pointer relative";
                  badgeElement = <span className="absolute bottom-0.5 right-0.5 text-[6px] font-mono text-emerald-500 font-bold uppercase">Ready</span>;
                } else {
                  cellClass = "bg-slate-950/40 border border-slate-900 text-slate-600 hover:border-slate-700 cursor-pointer relative";
                  badgeElement = <span className="absolute bottom-0.5 right-0.5 text-[6px] font-mono text-slate-700 font-bold uppercase">Off</span>;
                }
              } else {
                // Client booking mode:
                // Is selected?
                if (isSelected) {
                  cellClass = "bg-orange-500 text-slate-950 font-bold ring-2 ring-orange-500/30 cursor-pointer";
                } else if (isBlocked) {
                  cellClass = "bg-slate-950 border border-slate-900 text-slate-700 cursor-not-allowed opacity-40 flex items-center justify-center relative";
                  badgeElement = <Lock className="w-2.5 h-2.5 text-slate-800 absolute bottom-1 right-1" />;
                } else if (isWorkingDay) {
                  cellClass = "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/15 hover:border-emerald-400 cursor-pointer";
                } else {
                  cellClass = "bg-slate-950 border border-slate-900 text-slate-700 cursor-not-allowed opacity-40 flex items-center justify-center relative";
                  badgeElement = <span className="absolute bottom-1 right-1 text-[5px] text-slate-800 font-mono">Off</span>;
                }
              }

              return (
                <button
                  key={dayNum}
                  type="button"
                  onClick={() => handleDayClick(dayNum)}
                  disabled={!isEditable && (!isWorkingDay || isBlocked)}
                  className={`aspect-square rounded-xl text-xs font-mono font-bold flex flex-col items-center justify-center transition select-none ${cellClass}`}
                >
                  <span className={isSelected ? 'text-slate-950' : ''}>{dayNum}</span>
                  {badgeElement}
                </button>
              );
            })}
          </div>

          {/* Calendar legend */}
          <div className="flex flex-wrap items-center justify-start gap-4 pt-2 text-[9px] font-mono text-slate-500">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded bg-emerald-500/20 border border-emerald-500/40 block" />
              <span>Available Operating Shifts</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded bg-red-500/20 border border-red-500/40 block" />
              <span>Unavailable / Blocked</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded bg-slate-950 border border-slate-900 block" />
              <span>Off Shift Days</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
