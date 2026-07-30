import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Wrench, LogOut, X } from 'lucide-react';
import { User } from '../../types';
import { KazifyLogo } from '../common/KazifyLogo';

export interface TabItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

interface SidebarProps {
  user: User;
  role: 'customer' | 'fundi' | 'admin';
  menuItems: TabItem[];
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  onLogout: () => void;
  isDark: boolean;
  isMobileSidebarOpen: boolean;
  setIsMobileSidebarOpen: (open: boolean) => void;
  onRoleSwitch?: (newRole: 'customer' | 'fundi' | 'admin') => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  user,
  role,
  menuItems,
  activeTab,
  onTabChange,
  onLogout,
  isDark,
  isMobileSidebarOpen,
  setIsMobileSidebarOpen,
  onRoleSwitch
}) => {
  const SidebarContent = () => (
    <div className={`h-full flex flex-col p-4 border-r transition-colors duration-150 ${
      isDark 
        ? 'bg-slate-950 border-slate-800 text-slate-100' 
        : 'bg-white border-slate-200 text-slate-800 shadow-sm'
    }`}>
      {/* Brand Header */}
      <div className="flex items-center space-x-3 px-2 py-3 mb-4">
        <KazifyLogo isDark={isDark} size="md" variant="horizontal" />
      </div>

      {/* Workspace Role Switcher Pills */}
      {onRoleSwitch && (
        <div className={`mb-6 p-1.5 rounded-xl border font-mono ${isDark ? 'bg-slate-900 border-slate-800/80' : 'bg-slate-100 border-slate-200'}`}>
          <div className="text-[9px] uppercase tracking-wider text-slate-400 font-bold px-1.5 mb-1 text-left">
            Active Persona:
          </div>
          <div className="grid grid-cols-3 gap-1">
            <button
              onClick={() => onRoleSwitch('customer')}
              className={`py-1 text-[10px] font-bold rounded-lg transition ${
                role === 'customer' 
                  ? 'bg-orange-500 text-slate-950 shadow-sm' 
                  : isDark 
                    ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              Client
            </button>
            <button
              onClick={() => onRoleSwitch('fundi')}
              className={`py-1 text-[10px] font-bold rounded-lg transition ${
                role === 'fundi' 
                  ? 'bg-orange-500 text-slate-950 shadow-sm' 
                  : isDark 
                    ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              Fundi
            </button>
            <button
              onClick={() => onRoleSwitch('admin')}
              className={`py-1 text-[10px] font-bold rounded-lg transition ${
                role === 'admin' 
                  ? 'bg-orange-500 text-slate-950 shadow-sm' 
                  : isDark 
                    ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              Admin
            </button>
          </div>
        </div>
      )}

      {/* Secondary role badge if no direct role switcher */}
      {!onRoleSwitch && (
        <div className="mb-6 px-2">
          <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-mono">
            <Wrench className="w-3 h-3" />
            <span className="capitalize font-bold">{role} Portal</span>
          </div>
        </div>
      )}

      {/* Navigation Menu */}
      <nav className="space-y-1.5 flex-1">
        {menuItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                if (onTabChange) onTabChange(item.id);
                setIsMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition-all duration-150 cursor-pointer text-left font-mono group focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 focus:outline-none ${
                isActive
                  ? 'bg-orange-500 text-slate-950 font-bold shadow-md shadow-orange-500/10'
                  : isDark
                    ? 'text-slate-300 hover:bg-slate-900 hover:text-white border border-transparent hover:border-slate-800/60'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-transparent hover:border-slate-200'
              }`}
              id={`sidebar-nav-${item.id}`}
            >
              <div className="flex items-center space-x-3">
                <span className={`w-4 h-4 flex items-center justify-center transition-colors ${
                  isActive 
                    ? 'text-slate-950' 
                    : isDark 
                      ? 'text-slate-400 group-hover:text-white' 
                      : 'text-slate-500 group-hover:text-slate-900'
                }`}>
                  {item.icon}
                </span>
                <span className="font-semibold">{item.label}</span>
              </div>
              {item.badge !== undefined && (
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  isActive 
                    ? 'bg-slate-950 text-orange-400' 
                    : 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
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
    <>
      {/* Desktop Sidebar */}
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

            {/* Mobile Sidebar */}
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
    </>
  );
};
