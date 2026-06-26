import React, { useState, useEffect, lazy, Suspense } from 'react';
import LandingPage from './components/LandingPage';
import AuthScreen from './components/AuthScreen';
import DashboardLayout from './components/DashboardLayout';
import { User } from './types';
import { Helmet } from './components/Helmet';
import api from './services/api';
import { preloadService } from './services/preloadService';

const CustomerDashboard = lazy(() => import('./components/CustomerDashboard'));
const FundiDashboard = lazy(() => import('./components/FundiDashboard'));
const AdminDashboard = lazy(() => import('./components/AdminDashboard'));

const DashboardFallback = () => (
  <div className="flex flex-col items-center justify-center min-h-[450px] w-full p-8 text-center space-y-4">
    <div className="relative w-12 h-12">
      <div className="absolute inset-0 rounded-full border-2 border-slate-900" />
      <div className="absolute inset-0 rounded-full border-2 border-t-orange-500 animate-spin" />
    </div>
    <div className="space-y-1">
      <h3 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">Loading Dashboard</h3>
      <p className="text-[10px] font-mono text-slate-500">Preparing your personalized work center...</p>
    </div>
  </div>
);

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const savedUser = localStorage.getItem('kazify_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch (e) {
      console.error('Failed to parse saved user from localStorage:', e);
      return null;
    }
  });
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('kazify_token') || null;
  });
  const [showAuthScreen, setShowAuthScreen] = useState(false);

  // Lifted Layout Navigation states
  const [activeTab, setActiveTab] = useState('overview');
  const [notifications, setNotifications] = useState<any[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleRefresh = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  // Reset tab selection state when logged out or switched user role
  useEffect(() => {
    setActiveTab('overview');
    setNotifications([]);
    setRefreshTrigger(0);
  }, [currentUser]);

  // central preload strategy for critical dashboard assets and user profile data
  useEffect(() => {
    if (currentUser) {
      const userId = currentUser.id;
      const role = currentUser.role;

      console.log(`[PreloadStrategy] Prefetching critical user profile/asset data for ${role} (ID: ${userId})`);

      // Preload critical core user data
      preloadService.preload(`kyc-${userId}`, () => api.get(`/api/kyc/${userId}`));
      preloadService.preload(`wallet-${userId}`, () => api.get(`/api/wallets/${userId}`));

      if (role === 'admin') {
        preloadService.preload('admin-metrics', () => api.get('/api/admin/metrics'));
        preloadService.preload('admin-disputes', () => api.get('/api/disputes'));
        preloadService.preload('admin-kyc', () => api.get('/api/admin/kyc'));
        preloadService.preload('admin-jobs', () => api.get('/api/jobs'));
      } else if (role === 'fundi') {
        preloadService.preload(`fundi-jobs-${userId}`, () => api.get(`/api/jobs?role=fundi&user_id=${userId}`));
        preloadService.preload(`fundi-notifications-${userId}`, () => api.get(`/api/notifications?user_id=${userId}`));
      } else {
        preloadService.preload('customer-escrow-history', () => api.get('/api/escrow/history'));
        preloadService.preload(`customer-jobs-${userId}`, () => api.get(`/api/jobs?role=customer&user_id=${userId}`));
        preloadService.preload(`customer-notifications-${userId}`, () => api.get(`/api/notifications?user_id=${userId}`));
      }
    } else {
      preloadService.clear();
    }
  }, [currentUser]);

  // Sync state on localStorage change or custom events
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'kazify_token') {
        setToken(e.newValue);
      } else if (e.key === 'kazify_user') {
        try {
          setCurrentUser(e.newValue ? JSON.parse(e.newValue) : null);
        } catch {
          setCurrentUser(null);
        }
      }
    };

    const handleTokenRefreshed = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        setToken(customEvent.detail);
      }
    };

    const handleUserUpdated = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        setCurrentUser(customEvent.detail);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('token-refreshed', handleTokenRefreshed);
    window.addEventListener('user-updated', handleUserUpdated);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('token-refreshed', handleTokenRefreshed);
      window.removeEventListener('user-updated', handleUserUpdated);
    };
  }, []);

  // Listen for global auth errors to log out
  useEffect(() => {
    const handleAuthError = () => {
      handleLogout();
    };
    window.addEventListener('auth-error', handleAuthError);
    return () => {
      window.removeEventListener('auth-error', handleAuthError);
    };
  }, []);

  const handleLoginSuccess = (userToken: string, userObj: User) => {
    setToken(userToken);
    setCurrentUser(userObj);
    localStorage.setItem('kazify_token', userToken);
    localStorage.setItem('kazify_user', JSON.stringify(userObj));
    setShowAuthScreen(false);
  };

  const handleLogout = () => {
    setToken(null);
    setCurrentUser(null);
    localStorage.removeItem('kazify_token');
    localStorage.removeItem('kazify_user');
    localStorage.removeItem('kazify_refresh_token');
    setShowAuthScreen(false);
  };

  if (currentUser) {
    const role = currentUser.role === 'admin' ? 'admin' : currentUser.role === 'fundi' ? 'fundi' : 'customer';
    
    let title = 'Client Center';
    let dashboardContent = null;

    if (role === 'admin') {
      title = 'Global Tower';
      dashboardContent = (
        <AdminDashboard 
          user={currentUser} 
          onLogout={handleLogout} 
          isWrapped={true}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          refreshTrigger={refreshTrigger}
        />
      );
    } else if (role === 'fundi') {
      title = 'Trades Expert';
      dashboardContent = (
        <FundiDashboard 
          user={currentUser} 
          onLogout={handleLogout} 
          isWrapped={true}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          notifications={notifications}
          setNotifications={setNotifications}
          refreshTrigger={refreshTrigger}
        />
      );
    } else {
      title = 'Client Center';
      dashboardContent = (
        <CustomerDashboard 
          user={currentUser} 
          onLogout={handleLogout} 
          isWrapped={true}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          notifications={notifications}
          setNotifications={setNotifications}
          refreshTrigger={refreshTrigger}
        />
      );
    }

    const unreadCount = notifications.filter(n => !n.is_read).length;

    return (
      <>
        <Helmet 
          title={role === 'admin' ? "Global Tower Control" : role === 'fundi' ? "Trades Expert Portal" : "Client Center Dashboard"} 
          description={
            role === 'admin' ? "Kazify Central Control Panel to supervise disputes, manage verification documents, and audit local trade escrow safety." :
            role === 'fundi' ? "Trades Expert workspace on Kazify. Set availability, view bookings, submit job completion proof, and track your escrow earnings safely." :
            "Kazify Client Portal. Post new service jobs, check fair market price estimations with Gemini AI, and release funds securely."
          } 
        />
        <DashboardLayout
          user={currentUser}
          onLogout={handleLogout}
          role={role}
          title={title}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          notifications={notifications}
          unreadCount={unreadCount}
          onRefresh={handleRefresh}
        >
          <Suspense fallback={<DashboardFallback />}>
            {dashboardContent}
          </Suspense>
        </DashboardLayout>
      </>
    );
  }

  if (showAuthScreen) {
    return (
      <>
        <Helmet title="Secure Access" description="Secure authentication and sign-up portal to Kazify Handy Services." />
        <AuthScreen onLoginSuccess={handleLoginSuccess} />
      </>
    );
  }

  return (
    <LandingPage onGetStarted={() => setShowAuthScreen(true)} />
  );
}
