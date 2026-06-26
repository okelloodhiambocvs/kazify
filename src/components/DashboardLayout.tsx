import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { 
  Menu, X, Bell, LogOut, Compass, Shield, Wrench, LayoutDashboard, 
  PlusCircle, History, Briefcase, DollarSign, Settings, RefreshCw,
  FolderOpen, Calendar, HelpCircle, User, Check, Send, Sun, Moon,
  Wallet, ShieldCheck, AlertTriangle, FileText, TrendingUp, ShieldAlert, Activity
} from 'lucide-react';
import { User as UserType } from '../types';
import { useTheme } from '../context/ThemeContext';

interface TabItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: string | number;
}

interface DashboardLayoutProps {
  user: UserType;
  onLogout: () => void;
  role: 'customer' | 'fundi' | 'admin';
  title?: string;
  children: React.ReactNode;
  
  // Tab state management
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  tabs?: TabItem[];

  // Notification management (Websocket real-time)
  notifications: any[];
  unreadCount?: number;
  onRefresh?: () => void;
}

export default function DashboardLayout({
  user,
  onLogout,
  role,
  title,
  children,
  activeTab,
  onTabChange,
  tabs,
  notifications = [],
  unreadCount = 0,
  onRefresh
}: DashboardLayoutProps) {
  const { theme, toggleTheme, isDark } = useTheme();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Profile preferences state
  const [settingsName, setSettingsName] = useState(user.name);
  const [settingsPhone, setSettingsPhone] = useState(user.phone || '');
  const [settingsStatus, setSettingsStatus] = useState('Available');
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsSavedMessage, setSettingsSavedMessage] = useState('');
  
  // Contact Support state
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [supportType, setSupportType] = useState('order'); // 'order' | 'account' | 'payment' | 'other'
  const [supportOrderId, setSupportOrderId] = useState('');
  const [supportMessage, setSupportMessage] = useState('');
  const [isSubmittingSupport, setIsSubmittingSupport] = useState(false);
  const [supportTicketId, setSupportTicketId] = useState('');
  const [supportSuccessMessage, setSupportSuccessMessage] = useState('');

  const getInitials = (name: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  };

  // Fallback defaults for tabs of each role if none are provided
  const getRoleDefaultTabs = (): TabItem[] => {
    switch (role) {
      case 'customer':
        return [
          { id: 'overview', label: 'Service Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
          { id: 'request', label: 'Request Tradesman', icon: <PlusCircle className="w-4 h-4" /> },
          { id: 'contracts', label: 'Contracts Register', icon: <FileText className="w-4 h-4" /> },
          { id: 'wallet', label: 'My Wallet', icon: <Wallet className="w-4 h-4" /> },
          { id: 'disputes', label: 'Disputes Room', icon: <AlertTriangle className="w-4 h-4" /> },
          { id: 'history', label: 'Past Orders', icon: <History className="w-4 h-4" /> },
        ];
      case 'fundi':
        return [
          { id: 'overview', label: 'Expert Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
          { id: 'leads', label: 'Leads Board', icon: <Compass className="w-4 h-4" /> },
          { id: 'jobs', label: 'Assigned Work', icon: <Briefcase className="w-4 h-4" /> },
          { id: 'contracts', label: 'Contracts Register', icon: <FileText className="w-4 h-4" /> },
          { id: 'earnings', label: 'Earnings Overview', icon: <TrendingUp className="w-4 h-4" /> },
          { id: 'calendar', label: 'Booking Hours', icon: <Calendar className="w-4 h-4" /> },
          { id: 'wallet', label: 'My Wallet', icon: <Wallet className="w-4 h-4" /> },
          { id: 'kyc', label: 'KYC Verification', icon: <ShieldCheck className="w-4 h-4" /> },
          { id: 'disputes', label: 'Disputes Room', icon: <AlertTriangle className="w-4 h-4" /> },
        ];
      case 'admin':
        return [
          { id: 'overview', label: 'Global Tower', icon: <LayoutDashboard className="w-4 h-4" /> },
          { id: 'allocations', label: 'Allocation Desk', icon: <Wrench className="w-4 h-4" /> },
          { id: 'orders', label: 'Order Audits', icon: <FolderOpen className="w-4 h-4" /> },
          { id: 'escrow', label: 'Escrow Ledger', icon: <DollarSign className="w-4 h-4" /> },
          { id: 'disputes', label: 'Disputes Room', icon: <AlertTriangle className="w-4 h-4" /> },
          { id: 'kyc_review', label: 'KYC Review Desk', icon: <ShieldCheck className="w-4 h-4" /> },
          { id: 'analytics', label: 'Platform Analytics', icon: <TrendingUp className="w-4 h-4" /> },
          { id: 'fraud', label: 'Fraud Intelligence', icon: <ShieldAlert className="w-4 h-4" /> },
          { id: 'audit', label: 'System Audit Logs', icon: <Activity className="w-4 h-4" /> },
        ];
    }
  };

  const menuItems = tabs || getRoleDefaultTabs();

  const getRoleLabel = () => {
    switch (role) {
      case 'admin': return 'Control Tower';
      case 'fundi': return 'Trades Expert';
      default: return 'Client Center';
    }
  };

  const getRoleColor = () => {
    switch (role) {
      case 'admin': return 'text-red-400 bg-red-500/10 border-red-500/20';
      case 'fundi': return 'text-orange-400 bg-orange-500/10 border-orange-500/20';
      default: return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
    }
  };

  const SidebarContent = () => (
    <div className={`flex flex-col h-full p-4 border-r transition-colors duration-150 ${isDark ? 'bg-slate-950 text-slate-100 border-slate-800' : 'bg-white text-slate-800 border-slate-200'}`}>
      {/* Brand Group */}
      <div className="flex items-center space-x-3 mb-8 px-2 pt-2">
        <div className="w-9 h-9 rounded-xl bg-orange-500 flex items-center justify-center font-bold text-slate-950 text-lg">
          K
        </div>
        <div className="flex flex-col">
          <span className={`font-display font-bold text-xl tracking-tight uppercase leading-none ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Kaz<span className="text-orange-500">ify</span>
          </span>
          <span className={`text-[10px] font-mono mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Enterprise dispatch</span>
        </div>
      </div>

      {/* Role Indicator Info */}
      <div className="mb-6 px-2">
        <div className={`text-[10px] font-mono font-medium px-2.5 py-1.5 rounded-lg border flex items-center justify-between ${getRoleColor()}`}>
          <span className="tracking-wider uppercase">{getRoleLabel()}</span>
          <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse"></span>
        </div>
      </div>

      {/* Navigation list */}
      <nav className="flex-1 space-y-1">
        <span className={`text-[10px] font-mono font-semibold uppercase tracking-widest px-2 block mb-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
          Workspace Navigation
        </span>
        {menuItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                if (onTabChange) onTabChange(item.id);
                setIsMobileSidebarOpen(false);
              }}
              aria-label={`Navigate to ${item.label}`}
              className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-left text-xs font-semibold font-mono tracking-wide transition cursor-pointer focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 focus:outline-none ${
                isActive 
                  ? 'bg-orange-500 text-slate-950 font-bold shadow-md shadow-orange-500/10' 
                  : isDark
                    ? 'text-slate-400 hover:text-white hover:bg-slate-900 border border-transparent hover:border-slate-800'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-transparent hover:border-slate-200'
              }`}
            >
              <div className="flex items-center space-x-3">
                {item.icon}
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  isActive 
                    ? 'bg-slate-950 text-orange-400' 
                    : isDark 
                      ? 'bg-slate-900 text-slate-400 border border-slate-800' 
                      : 'bg-slate-100 text-slate-600 border border-slate-200'
                }`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* User Session card */}
      <div className={`border-t pt-4 mt-auto ${isDark ? 'border-slate-800' : 'border-slate-205'}`}>
        <div className={`flex items-center space-x-3 p-2 rounded-xl border transition-colors duration-150 ${isDark ? 'bg-slate-900/60 border-slate-900' : 'bg-slate-50 border-slate-200'}`}>
          <img 
            referrerPolicy="no-referrer"
            src={user.avatar_url || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100'} 
            alt="user avatar" 
            className="w-8 h-8 rounded-full border border-orange-500/30 object-cover"
          />
          <div className="text-left flex-1 min-w-0">
            <span className={`text-xs font-semibold block truncate ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{user.name}</span>
            <span className={`text-[9px] font-mono block truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{user.phone || '0700000001'}</span>
          </div>
          <button
            onClick={onLogout}
            className={`p-1.5 rounded-lg transition cursor-pointer border focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 focus:outline-none ${
              isDark 
                ? 'text-slate-400 bg-slate-900 border-slate-800 hover:border-red-500/30 hover:text-red-400' 
                : 'text-slate-500 bg-white border-slate-200 hover:border-red-500/30 hover:text-red-500 shadow-sm'
            }`}
            title="Logout"
            aria-label="Logout account session"
            id="sidebar-logout"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className={`min-h-screen flex font-sans overflow-hidden transition-colors duration-150 ${isDark ? 'bg-slate-900 text-slate-100' : 'bg-slate-50 text-slate-800'}`}>
      {/* Desktop Sidebar (hidden on mobile, fixed width on lg+) */}
      <aside className="hidden lg:block w-64 flex-shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile Drawer Sidebar Overlay */}
      <AnimatePresence>
        {isMobileSidebarOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className={`fixed inset-0 z-40 lg:hidden ${isDark ? 'bg-slate-950/80 backdrop-blur-sm' : 'bg-slate-900/60 backdrop-blur-sm'}`}
              onClick={() => setIsMobileSidebarOpen(false)}
            />

            {/* Mobile Sidebar (animated slide out) */}
            <motion.aside 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 210 }}
              className="fixed inset-y-0 left-0 w-64 z-50 lg:hidden"
            >
              <div className="h-full relative">
                <SidebarContent />
                <button 
                  onClick={() => setIsMobileSidebarOpen(false)}
                  className={`absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-xl border shadow-lg transition-colors cursor-pointer ${
                    isDark 
                      ? 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white' 
                      : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900'
                  }`}
                  title="Close Navigation Menu"
                  id="mobile-sidebar-close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Right Column content panel */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Consistent Top Navigation Header */}
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
            <div className="relative">
              <button 
                onClick={() => { setShowNotifications(!showNotifications); }}
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
                      {notifications.length === 0 ? (
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
                {/* User initials circular badge */}
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
                    {/* Backdrop overlay for dropdown close */}
                    <div 
                      className="fixed inset-0 z-40 cursor-default" 
                      onClick={() => setShowProfileDropdown(false)}
                    />
                    
                    {/* Dropdown Card */}
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
                      {/* User profile brief */}
                      <div className={`px-2 py-2.5 border-b mb-2.5 text-left ${isDark ? 'border-slate-800/80' : 'border-slate-200'}`}>
                        <span className={`text-[9px] font-mono font-bold block uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>KAZIFY USER PROFILE</span>
                        <span className={`text-xs font-bold block truncate mt-1.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>{user.name}</span>
                        <span className={`text-[10px] font-mono block truncate mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{user.phone || '0700000001'}</span>
                      </div>

                      {/* Quick navigation actions */}
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
                          id="dropdown-logout-btn"
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

        {/* Content View Body Frame */}
        <main className="flex-1 p-4 sm:p-6 pb-24 lg:pb-6 w-full max-w-7xl mx-auto">
          <motion.div
            key={activeTab || 'content'}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="w-full"
          >
            {children}
          </motion.div>
        </main>

        {/* Dashboard Footer */}
        <footer className={`mt-auto py-6 px-4 sm:px-6 pb-24 lg:pb-6 text-center text-xs border-t transition-colors duration-150 ${
          isDark 
            ? 'bg-slate-950 border-slate-800/80 text-slate-400' 
            : 'bg-white border-slate-200 text-slate-500 shadow-inner'
        }`}>
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 font-mono">
            <span className={isDark ? 'text-slate-500' : 'text-slate-400'}>Copyright © 2026 KAZIFY Marketplace. Authorized Support Portal.</span>
            <button
              onClick={() => {
                setShowSupportModal(true);
              }}
              className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-400 text-slate-950 text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer shadow-md shadow-orange-500/10"
              id="dashboard-footer-support-btn"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Contact Support</span>
            </button>
          </div>
        </footer>

        {/* Ergonomic Mobile Bottom Navigation Bar (Visible only on mobile/tablet) */}
        <div className={`lg:hidden fixed bottom-0 left-0 right-0 backdrop-blur-md border-t px-1 py-1.5 flex justify-around items-center z-40 transition-all duration-150 ${
          isDark 
            ? 'bg-slate-950/95 border-slate-800/90 shadow-[0_-10px_25px_rgba(2,6,23,0.8)]' 
            : 'bg-white/95 border-slate-200 shadow-[0_-10px_25px_rgba(0,0,0,0.05)]'
        }`}>
          {menuItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (onTabChange) onTabChange(item.id);
                  setIsMobileSidebarOpen(false);
                }}
                className={`flex flex-col items-center justify-center pt-2 pb-1 px-1 rounded-xl transition-all duration-200 cursor-pointer flex-1 text-center min-w-[56px] min-h-[48px] relative ${
                  isActive 
                    ? 'text-orange-500 font-bold scale-102' 
                    : isDark 
                      ? 'text-slate-400 hover:text-white' 
                      : 'text-slate-500 hover:text-slate-900'
                }`}
                title={`Switch to ${item.label}`}
              >
                <div className={`p-1.5 rounded-lg transition-all duration-200 ${
                  isActive 
                    ? 'bg-orange-500/10 text-orange-500' 
                    : isDark 
                      ? 'text-slate-400 [&>svg]:text-slate-500' 
                      : 'text-slate-500 [&>svg]:text-slate-400'
                } [&>svg]:w-[18px] [&>svg]:h-[18px] flex items-center justify-center`}>
                  {item.icon}
                </div>
                <span className="text-[9px] font-mono font-bold mt-1 tracking-tight truncate max-w-[80px] block">
                  {item.label
                    .replace('Service ', '')
                    .replace('Expert ', '')
                    .replace('Global ', '')
                    .replace('Assigned ', '')
                    .replace('Past ', '')
                  }
                </span>

                {item.badge !== undefined && (
                  <span className="absolute top-1.5 right-1.5 bg-orange-500 text-slate-950 text-[8px] font-bold px-1.5 py-0.5 rounded-full leading-none min-w-[14px] text-center shadow-sm">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}

          {/* Persistent Support Shortcut Key */}
          <button
            onClick={() => {
              setShowSupportModal(true);
              setIsMobileSidebarOpen(false);
            }}
            className={`flex flex-col items-center justify-center pt-2 pb-1 px-1 rounded-xl transition-all duration-200 cursor-pointer flex-1 text-center min-w-[56px] min-h-[48px] ${
              isDark ? 'text-slate-500 hover:text-white' : 'text-slate-400 hover:text-slate-900'
            }`}
            title="Open Support Desk"
          >
            <div className={`p-1.5 rounded-lg [&>svg]:w-[18px] [&>svg]:h-[18px] flex items-center justify-center ${
              isDark ? 'text-slate-500 hover:text-orange-400' : 'text-slate-400 hover:text-orange-500'
            }`}>
              <HelpCircle />
            </div>
            <span className="text-[9px] font-mono font-bold mt-1 tracking-tight">Support</span>
          </button>
        </div>
      </div>

      {/* Settings Modal */}
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

      {/* Contact Support Modal */}
      <AnimatePresence>
        {showSupportModal && (
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
              id="support-ticket-modal"
            >
              <button
                onClick={() => {
                  setShowSupportModal(false);
                  setSupportSuccessMessage('');
                  setSupportMessage('');
                  setSupportOrderId('');
                }}
                className={`absolute top-4 right-4 p-1.5 rounded-xl border transition cursor-pointer font-mono ${
                  isDark 
                    ? 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white' 
                    : 'bg-slate-100 border-slate-200 text-slate-605 hover:text-slate-900'
                }`}
                id="support-modal-close"
              >
                <X className="w-4 h-4" />
              </button>

              {supportSuccessMessage ? (
                <div className="text-center py-6">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-4 scale-110">
                    <Check className="w-6 h-6 animate-pulse" />
                  </div>
                  <h3 className={`text-base font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>Help Request Logged!</h3>
                  <div className={`p-3 rounded-xl mb-4 text-xs font-mono text-left space-y-1.5 border ${
                    isDark ? 'bg-slate-950 border-slate-850' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div className="flex justify-between">
                      <span className={isDark ? 'text-slate-500' : 'text-slate-400'}>Ticket ID:</span>
                      <span className="text-orange-400 font-bold">#{supportTicketId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className={isDark ? 'text-slate-500' : 'text-slate-400'}>Category:</span>
                      <span className={isDark ? 'text-slate-300 capitalize' : 'text-slate-700 capitalize'}>{supportType} Issue</span>
                    </div>
                    {supportOrderId && (
                      <div className="flex justify-between">
                        <span className={isDark ? 'text-slate-500' : 'text-slate-400'}>Reference:</span>
                        <span className={`truncate max-w-[180px] ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{supportOrderId}</span>
                      </div>
                    )}
                  </div>
                  <p className={`text-xs leading-relaxed max-w-xs mx-auto mb-6 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    M-Pesa Escrow Desk operators and National Dispatch auditors have received your inquiry. We will contact you or issue an SMS update on: <span className={`font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{user.phone || '0700000001'}</span> shortly.
                  </p>
                  <button
                    onClick={() => {
                      setShowSupportModal(false);
                      setSupportSuccessMessage('');
                      setSupportMessage('');
                      setSupportOrderId('');
                    }}
                    className="w-full py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-slate-950 text-xs font-bold font-mono transition cursor-pointer"
                    id="support-success-dismiss"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <div className="text-left">
                  <div className="flex items-center space-x-3 mb-5">
                    <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400">
                      <HelpCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Contact Kazify Support</h3>
                      <span className={`text-[10px] font-mono tracking-wider uppercase ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Active Dispatch & Escrow Desk</span>
                    </div>
                  </div>

                  <form 
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (supportMessage.trim().length < 10) return;
                      setIsSubmittingSupport(true);
                      setTimeout(() => {
                        const randomId = 'KZ-' + Math.floor(10000 + Math.random() * 90000);
                        setSupportTicketId(randomId);
                        setIsSubmittingSupport(false);
                        setSupportSuccessMessage('Logged');
                      }, 1000);
                    }}
                    className="space-y-4"
                  >
                    <div>
                      <label className={`text-[10px] font-mono font-semibold uppercase tracking-wider block mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>SUPPORT CATEGORY</label>
                      <select
                        value={supportType}
                        onChange={(e) => setSupportType(e.target.value)}
                        className={`w-full rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-orange-500 font-mono focus:ring-1 focus:ring-orange-500/20 border ${
                          isDark 
                            ? 'bg-slate-950 border-slate-800 text-white' 
                            : 'bg-slate-50 border-slate-205 text-slate-900'
                        }`}
                        id="support-ticket-category"
                      >
                        <option value="order">📦 Order / Tradesman Dispatch</option>
                        <option value="payment">💳 M-Pesa Escrow Settlement</option>
                        <option value="account">🔒 Account & Phone Preferences</option>
                        <option value="technical">🛠️ System or App Bug</option>
                        <option value="other">💬 General Inquiries & Suggestions</option>
                      </select>
                    </div>

                    {(supportType === 'order' || supportType === 'payment') && (
                      <div>
                        <label className={`text-[10px] font-mono font-semibold uppercase tracking-wider block mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>ORDER OR JOB ID (OPTIONAL)</label>
                        <input
                          type="text"
                          placeholder="e.g. JB-8391 or Transaction Code"
                          value={supportOrderId}
                          onChange={(e) => setSupportOrderId(e.target.value)}
                          className={`w-full rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-orange-500 font-mono focus:ring-1 focus:ring-orange-500/20 border ${
                            isDark 
                              ? 'bg-slate-950 border-slate-800 text-slate-100 placeholder:text-slate-600' 
                              : 'bg-slate-50 border-slate-205 text-slate-900 placeholder:text-slate-400'
                          }`}
                          id="support-ticket-order-id"
                        />
                      </div>
                    )}

                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <label className={`text-[10px] font-mono font-semibold uppercase tracking-wider block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>DETAILED DESCRIPTION</label>
                        <span className={`text-[9px] font-mono ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{supportMessage.length}/500 chars</span>
                      </div>
                      <textarea
                        rows={4}
                        placeholder="Please describe your issue, order conflict, or payout issue in detail..."
                        value={supportMessage}
                        onChange={(e) => setSupportMessage(e.target.value.slice(0, 500))}
                        className={`w-full rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-orange-500 font-mono focus:ring-1 focus:ring-orange-500/20 resize-none border ${
                          isDark 
                            ? 'bg-slate-950 border-slate-800 text-white placeholder:text-slate-600' 
                            : 'bg-slate-50 border-slate-250 text-slate-900 placeholder:text-slate-400'
                        }`}
                        id="support-ticket-description"
                        required
                      />
                      {supportMessage.trim().length > 0 && supportMessage.trim().length < 10 && (
                        <span className="text-[10px] text-orange-400 font-mono mt-1 block">Message must be at least 10 characters</span>
                      )}
                    </div>

                    <div className="flex gap-2 justify-end pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setShowSupportModal(false);
                          setSupportMessage('');
                          setSupportOrderId('');
                        }}
                        disabled={isSubmittingSupport}
                        className={`px-4 py-2.5 rounded-xl border text-xs font-semibold cursor-pointer font-mono disabled:opacity-50 ${
                          isDark 
                            ? 'bg-slate-950 hover:bg-slate-900 border-slate-800 text-slate-300' 
                            : 'bg-slate-100 hover:bg-slate-200/80 border-slate-200 text-slate-600'
                        }`}
                        id="support-cancel-btn"
                      >
                        Close
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmittingSupport || supportMessage.trim().length < 10}
                        className="px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 text-xs font-bold font-mono transition cursor-pointer flex items-center space-x-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                        id="support-submit-btn"
                      >
                        {isSubmittingSupport ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Routing...</span>
                          </>
                        ) : (
                          <>
                            <Send className="w-3.5 h-3.5" />
                            <span>Create Ticket</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
