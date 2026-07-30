import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell } from 'lucide-react';
import { Notification } from '../../types';

interface NotificationBellProps {
  notifications?: Notification[];
  showNotifications: boolean;
  setShowNotifications: (show: boolean) => void;
  isDark: boolean;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({
  notifications = [],
  showNotifications,
  setShowNotifications,
  isDark
}) => {
  const unreadCount = Array.isArray(notifications)
    ? notifications.filter(n => !n.read_at && !n.is_read).length
    : 0;

  return (
    <div className="relative">
      <button 
        onClick={() => setShowNotifications(!showNotifications)}
        className={`w-10 h-10 flex items-center justify-center rounded-xl border hover:border-orange-500 transition-all cursor-pointer relative active:scale-95 focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 focus:outline-none ${
          isDark 
            ? 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white' 
            : 'bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900 shadow-sm'
        }`}
        id="header-notifications-bell"
        title="Notifications"
        aria-label="Open system notifications panel"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4.5 h-4.5 rounded-full bg-orange-500 text-slate-950 text-[9px] font-bold flex items-center justify-center animate-bounce">
            {unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {showNotifications && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.15 }}
            className={`absolute right-0 mt-3 w-80 border p-4 rounded-2xl shadow-2xl z-50 text-sm ${
              isDark 
                ? 'bg-slate-950 border-slate-800 text-slate-100' 
                : 'bg-white border-slate-200 text-slate-800'
            }`}
            id="notifications-portal-card"
          >
            <div className={`flex items-center justify-between border-b pb-2 mb-2 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
              <span className={`text-xs font-mono font-bold block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>PLATFORM COMMUNICATIONS</span>
              {unreadCount > 0 && (
                <span className="text-[10px] text-orange-400 font-mono font-medium">{unreadCount} unread</span>
              )}
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {(!Array.isArray(notifications) || notifications.length === 0) ? (
                <span className="text-xs text-slate-500 text-center block py-6 font-mono">No live system notifications</span>
              ) : (
                notifications.map((notif) => (
                  <div key={notif.id} className={`p-2.5 rounded-xl border text-left transition-colors duration-150 ${isDark ? 'bg-slate-900 border-slate-800/60' : 'bg-slate-50 border-slate-200'}`}>
                    <span className="font-bold text-xs text-orange-400 block">{notif.title}</span>
                    <p className={`text-[11px] mt-0.5 leading-normal ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{notif.content}</p>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
