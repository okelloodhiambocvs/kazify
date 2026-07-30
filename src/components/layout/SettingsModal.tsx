import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { User } from '../../types';

interface SettingsModalProps {
  user: User;
  role: 'customer' | 'fundi' | 'admin';
  isDark: boolean;
  showSettingsModal: boolean;
  setShowSettingsModal: (show: boolean) => void;
  getInitials: (name: string) => string;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  user,
  role,
  isDark,
  showSettingsModal,
  setShowSettingsModal,
  getInitials
}) => {
  const [settingsName, setSettingsName] = useState(user.name || '');
  const [settingsPhone, setSettingsPhone] = useState(user.phone || '');
  const [settingsStatus, setSettingsStatus] = useState(user.status || 'Available');
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsSavedMessage, setSettingsSavedMessage] = useState('');

  return (
    <AnimatePresence>
      {showSettingsModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className={`w-full max-w-md p-6 rounded-2xl shadow-2xl relative border ${
              isDark 
                ? 'bg-slate-900 border-slate-800 text-slate-100' 
                : 'bg-white border-slate-200 text-slate-800'
            }`}
          >
            <button
              onClick={() => setShowSettingsModal(false)}
              className={`absolute top-4 right-4 p-1.5 rounded-xl border transition cursor-pointer ${
                isDark 
                  ? 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white' 
                  : 'bg-slate-100 border-slate-200 text-slate-650 hover:text-slate-900'
              }`}
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center font-bold text-slate-950 text-base font-mono shadow-md shadow-orange-500/10">
                {getInitials(settingsName)}
              </div>
              <div className="text-left">
                <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Kazify Account Settings</h3>
                <span className={`text-[10px] font-mono tracking-wider uppercase ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{role} Workspace</span>
              </div>
            </div>

            <div className="space-y-4 text-left">
              <div>
                <label className={`text-[10px] font-mono font-semibold uppercase tracking-wider block mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>DISPLAY NAME</label>
                <input
                  type="text"
                  value={settingsName}
                  onChange={(e) => setSettingsName(e.target.value)}
                  className={`w-full rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-orange-500 font-mono border ${
                    isDark 
                      ? 'bg-slate-950 border-slate-800 text-white' 
                      : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className={`text-[10px] font-mono font-semibold uppercase tracking-wider block mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>PHONE NUMBER</label>
                <input
                  type="text"
                  value={settingsPhone}
                  onChange={(e) => setSettingsPhone(e.target.value)}
                  className={`w-full rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-orange-500 font-mono border ${
                    isDark 
                      ? 'bg-slate-950 border-slate-800 text-white' 
                      : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>

              {role === 'fundi' && (
                <div>
                  <label className={`text-[10px] font-mono font-semibold uppercase tracking-wider block mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>SERVICE CAPABILITY STATUS</label>
                  <select
                    value={settingsStatus}
                    onChange={(e) => setSettingsStatus(e.target.value)}
                    className={`w-full rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-orange-500 font-mono border ${
                      isDark 
                        ? 'bg-slate-950 border-slate-800 text-white' 
                        : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  >
                    <option value="Available">🟢 Available for Active Dispatch</option>
                    <option value="Busy">🟡 Busy on Current Job</option>
                    <option value="Offline">🔴 Offline / Do Not Disturb</option>
                  </select>
                </div>
              )}

              {settingsSavedMessage ? (
                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs px-3 py-2.5 rounded-xl font-mono text-center animate-pulse">
                  {settingsSavedMessage}
                </div>
              ) : (
                <div className={`rounded-xl p-3 border leading-relaxed text-[11px] font-mono ${
                  isDark ? 'bg-slate-950 border-slate-800/60 text-slate-400' : 'bg-slate-55 border-slate-200 text-slate-500'
                }`}>
                  <span className="text-xs text-orange-400 font-bold block mb-1">M-Pesa Verification Pool</span>
                  All changes are securely synchronized across Kazify regional databases under encrypted audit logs.
                </div>
              )}

              <div className="flex gap-2 justify-end pt-2">
                <button
                  onClick={() => setShowSettingsModal(false)}
                  disabled={isSavingSettings}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer font-mono border disabled:opacity-50 ${
                    isDark 
                      ? 'bg-slate-950 hover:bg-slate-900 border-slate-800 text-slate-300' 
                      : 'bg-slate-150 hover:bg-slate-205 border-slate-200 text-slate-700'
                  }`}
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setIsSavingSettings(true);
                    setTimeout(() => {
                      setIsSavingSettings(false);
                      const updatedUser = { ...user, name: settingsName, phone: settingsPhone };
                      localStorage.setItem('kazify_user', JSON.stringify(updatedUser));
                      window.dispatchEvent(new CustomEvent('user-updated', { detail: updatedUser }));
                      setSettingsSavedMessage('Preferences synchronized successfully!');
                      setTimeout(() => {
                        setSettingsSavedMessage('');
                        setShowSettingsModal(false);
                        window.location.reload();
                      }, 1500);
                    }, 800);
                  }}
                  disabled={isSavingSettings}
                  className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-400 text-slate-950 text-xs font-bold font-mono transition cursor-pointer flex items-center space-x-1 disabled:opacity-50"
                >
                  {isSavingSettings ? 'Synchronizing...' : 'Save Settings'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
