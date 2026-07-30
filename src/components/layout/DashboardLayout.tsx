import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Compass, Wrench, LayoutDashboard, 
  PlusCircle, History, Briefcase, DollarSign,
  FolderOpen, Calendar, HelpCircle, 
  Wallet, ShieldCheck, AlertTriangle, FileText, TrendingUp, ShieldAlert, Activity
} from 'lucide-react';
import { User as UserType, Notification } from '../../types';
import { useTheme } from '../../context/ThemeContext';
import { Sidebar, TabItem } from './Sidebar';
import { TopBar } from './TopBar';
import { SettingsModal } from './SettingsModal';
import { SupportModal } from './SupportModal';

export type { TabItem };

export interface DashboardLayoutProps {
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
  notifications?: Notification[];
  unreadCount?: number;
  onRefresh?: () => void;
  onRoleSwitch?: (newRole: 'customer' | 'fundi' | 'admin') => void;
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
  onRefresh,
  onRoleSwitch
}: DashboardLayoutProps) {
  const { toggleTheme, isDark } = useTheme();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);

  const getInitials = (name: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  };

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

  return (
    <div className={`min-h-screen flex font-sans overflow-hidden transition-colors duration-150 ${isDark ? 'bg-slate-900 text-slate-100' : 'bg-slate-50 text-slate-800'}`}>
      {/* Sidebar */}
      <Sidebar
        user={user}
        role={role}
        menuItems={menuItems}
        activeTab={activeTab}
        onTabChange={onTabChange}
        onLogout={onLogout}
        isDark={isDark}
        isMobileSidebarOpen={isMobileSidebarOpen}
        setIsMobileSidebarOpen={setIsMobileSidebarOpen}
        onRoleSwitch={onRoleSwitch}
      />

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Header */}
        <TopBar
          user={user}
          role={role}
          title={title}
          isDark={isDark}
          toggleTheme={toggleTheme}
          onRefresh={onRefresh}
          notifications={notifications}
          setIsMobileSidebarOpen={setIsMobileSidebarOpen}
          onLogout={onLogout}
          onTabChange={onTabChange}
          setShowSettingsModal={setShowSettingsModal}
          getInitials={getInitials}
          getRoleLabel={getRoleLabel}
        />

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
      <SettingsModal
        user={user}
        role={role}
        isDark={isDark}
        showSettingsModal={showSettingsModal}
        setShowSettingsModal={setShowSettingsModal}
        getInitials={getInitials}
      />

      {/* Contact Support Modal */}
      <SupportModal
        user={user}
        isDark={isDark}
        showSupportModal={showSupportModal}
        setShowSupportModal={setShowSupportModal}
      />
    </div>
  );
}
