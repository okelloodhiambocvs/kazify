import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Menu, Sun, Moon, RefreshCw, LayoutDashboard, Settings, LogOut } from 'lucide-react';
import { User, Notification } from '../../types';
import { NotificationBell } from './NotificationBell';

interface TopBarProps {
  user: User;
  role: 'customer' | 'fundi' | 'admin';
  title?: string;
  isDark: boolean;
  toggleTheme: () => void;
  onRefresh?: () => void;
  notifications?: Notification[];
  setIsMobileSidebarOpen: (open: boolean) => void;
  onLogout: () => void;
  onTabChange?: (tab: string) => void;
  setShowSettingsModal: (show: boolean) => void;
  getInitials: (name: string) => string;
  getRoleLabel: () => string;
}

export const TopBar: React.FC<TopBarProps> = ({
  user,
  role,
  title,
  isDark,
  toggleTheme,
  onRefresh,
  notifications = [],
  setIsMobileSidebarOpen,
  onLogout,
  onTabChange,
  setShowSettingsModal,
  getInitials,
  getRoleLabel
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);

  return (
    <header className={`backdrop-blur-md border-b px-3 sm:px-6 py-3 sm:py-4 flex justify-between items-center sticky top-0 z-30 transition-colors duration-150 ${
      isDark 
        ? 'bg-slate-950/90 border-slate-800 text-slate-100' 
        : 'bg-white/95 border-slate-200 text-slate-800 shadow-sm'
    }`}>
      <div className="flex items-center space-x-2 sm:space-x-3">
        {/* Mobile Sidebar Toggle Button */}
        <button
          onClick={() => setIsMobileSidebarOpen(true)}
          className={`lg:hidden w-10 h-10 flex items-center justify-center rounded-xl border transition-all cursor-pointer hover:border-slate-700 active:scale-95 focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 focus:outline-none ${
            isDark 
              ? 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white' 
              : 'bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900'
          }`}
          id="mobile-sidebar-toggle"
          title="Open Navigation Menu"
          aria-label="Open Navigation Menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h1 className={`font-display font-bold text-base sm:text-lg truncate max-w-[140px] xs:max-w-xs sm:max-w-none px-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
          {title || getRoleLabel()}
        </h1>
      </div>

      <div className="flex items-center space-x-2 sm:space-x-3">
        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className={`w-10 h-10 flex items-center justify-center rounded-xl border transition-all cursor-pointer active:scale-95 focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 focus:outline-none ${
            isDark 
              ? 'bg-slate-900 border-slate-800 text-amber-400 hover:text-amber-300 hover:border-slate-700' 
              : 'bg-slate-100 border-slate-200 text-indigo-600 hover:text-indigo-800 hover:border-slate-300 shadow-sm'
          }`}
          title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          id="header-theme-toggle"
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Refresh action if provided */}
        {onRefresh && (
          <button
            onClick={onRefresh}
            className={`w-10 h-10 flex items-center justify-center rounded-xl border hover:border-orange-500 transition-all cursor-pointer active:scale-95 focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 focus:outline-none ${
              isDark 
                ? 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white' 
                : 'bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900 shadow-sm'
            }`}
            title="Refresh Metrics"
            aria-label="Refresh current tab metrics"
            id="header-refresh-btn"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        )}

        {/* Notifications Alert Center */}
        <NotificationBell
          notifications={notifications}
          showNotifications={showNotifications}
          setShowNotifications={setShowNotifications}
          isDark={isDark}
        />

        {/* User Profile Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setShowProfileDropdown(!showProfileDropdown);
              setShowNotifications(false);
            }}
            className={`flex items-center sm:space-x-2 border p-1 sm:pl-1.5 sm:pr-3.5 rounded-xl transition-all cursor-pointer select-none min-h-[40px] focus:outline-none focus:ring-2 focus:ring-orange-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
              isDark 
                ? 'bg-slate-900 hover:bg-slate-850 border-slate-850 hover:border-orange-500/50' 
                : 'bg-slate-100 hover:bg-slate-200/80 border-slate-200 hover:border-orange-500/50 shadow-sm'
            }`}
            id="header-profile-dropdown-trigger"
            title={`${user.name}'s Profile Workspace`}
            aria-label="Open profile dropdown menu"
          >
            <div className="w-8 h-8 rounded-lg bg-orange-500 text-slate-950 flex items-center justify-center text-xs font-bold font-mono shadow-md shadow-orange-500/10">
              {getInitials(user.name)}
            </div>
            <div className="text-left hidden sm:block">
              <span className={`text-xs font-bold block max-w-[124px] truncate leading-tight ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{user.name}</span>
              <span className={`text-[9px] font-mono tracking-wider block uppercase leading-none mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{role}</span>
            </div>
          </button>

          <AnimatePresence>
            {showProfileDropdown && (
              <>
                <div 
                  className="fixed inset-0 z-40 cursor-default" 
                  onClick={() => setShowProfileDropdown(false)}
                />
                
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  transition={{ duration: 0.15 }}
                  className={`absolute right-0 mt-3 w-60 border p-3 rounded-2xl shadow-2xl z-50 text-sm ${
                    isDark 
                      ? 'bg-slate-950 border-slate-800 text-slate-100' 
                      : 'bg-white border-slate-200 text-slate-800'
                  }`}
                  id="header-profile-dropdown-menu"
                >
                  <div className={`px-2 py-2.5 border-b mb-2.5 text-left ${isDark ? 'border-slate-800/80' : 'border-slate-200'}`}>
                    <span className={`text-[9px] font-mono font-bold block uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>KAZIFY USER PROFILE</span>
                    <span className={`text-xs font-bold block truncate mt-1.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>{user.name}</span>
                    <span className={`text-[10px] font-mono block truncate mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{user.phone || '0700000001'}</span>
                  </div>

                  <div className="space-y-1">
                    {onTabChange && (
                      <button
                        onClick={() => {
                          if (onTabChange) onTabChange('overview');
                          setShowProfileDropdown(false);
                        }}
                        className={`w-full flex items-center space-x-2.5 px-3 py-2 text-xs rounded-xl transition text-left cursor-pointer font-mono ${
                          isDark 
                            ? 'text-slate-300 hover:text-white hover:bg-slate-900 border-transparent hover:border-slate-800/60' 
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 border-transparent hover:border-slate-200'
                        }`}
                      >
                        <LayoutDashboard className="w-3.5 h-3.5 text-slate-400" />
                        <span>Workspace Home</span>
                      </button>
                    )}

                    <button
                      onClick={() => {
                        setShowSettingsModal(true);
                        setShowProfileDropdown(false);
                      }}
                      className={`w-full flex items-center space-x-2.5 px-3 py-2 text-xs rounded-xl transition text-left cursor-pointer font-mono ${
                        isDark 
                          ? 'text-slate-300 hover:text-white hover:bg-slate-900 border-transparent hover:border-slate-800/60' 
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 border-transparent hover:border-slate-200'
                      }`}
                      id="profile-dropdown-settings-btn"
                      title="Configure Account Settings"
                    >
                      <Settings className="w-3.5 h-3.5 text-slate-400" />
                      <span>Work Settings</span>
                    </button>

                    <div className={`border-t my-2 ${isDark ? 'border-slate-800/80' : 'border-slate-200'}`} />

                    <button
                      onClick={() => {
                        setShowProfileDropdown(false);
                        onLogout();
                      }}
                      className={`w-full flex items-center space-x-2.5 px-3 py-2.5 text-xs rounded-xl transition text-left cursor-pointer font-bold font-mono ${
                        isDark 
                          ? 'text-red-400 hover:text-red-300 hover:bg-red-500/10' 
                          : 'text-red-600 hover:text-red-500 hover:bg-red-50'
                      }`}
                      id="dropdown-logout-btn font-mono"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out Session</span>
                    </button>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
};
