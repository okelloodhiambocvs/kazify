import React, { useState } from 'react';
import { ShieldAlert, LogIn, UserPlus } from 'lucide-react';
import { User, UserRole } from '../types';
import api from '../services/api';

interface AuthScreenProps {
  onLoginSuccess: (token: string, user: User) => void;
}

export default function AuthScreen({ onLoginSuccess }: AuthScreenProps) {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('customer');
  const [category, setCategory] = useState('Plumbing');
  const [errMessage, setErrMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrMessage('');

    const url = activeTab === 'login' ? '/api/auth/login' : '/api/auth/register';
    const payload = activeTab === 'login' 
      ? (email ? { email, password } : { phone, password })
      : { name, phone, email, password, role, category };

    try {
      const res = await api.post(url, payload);
      if (res.data.refreshToken) {
        localStorage.setItem('kazify_refresh_token', res.data.refreshToken);
      }
      onLoginSuccess(res.data.token, res.data.user);
    } catch (err: any) {
      setErrMessage(err.response?.data?.error || 'Identity credentials validation failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="auth-container" className="flex items-center justify-center min-h-screen bg-slate-900 px-4 py-12 relative overflow-hidden font-sans">
      <div className="absolute inset-0 opacity-5 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-orange-400 via-indigo-900 to-slate-900"></div>

      <div className="w-full max-w-md bg-slate-950 border border-slate-800 rounded-3xl p-8 shadow-2xl relative z-10">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-orange-500 mx-auto flex items-center justify-center shadow-lg shadow-orange-500/30 mb-3">
            <span className="font-display font-extrabold text-2xl text-slate-950">K</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white font-display uppercase">
            Kaz<span className="text-orange-500">ify</span>
          </h2>
          <p className="text-xs font-mono text-slate-400 mt-1">Kenya's premier on-demand trades hub</p>
        </div>

        <div className="flex bg-slate-900 p-1.5 rounded-xl border border-slate-800/80 mb-6" role="tablist">
          <button
            onClick={() => { setActiveTab('login'); setErrMessage(''); }}
            className={`flex-1 text-center py-2 text-sm font-medium rounded-lg transition cursor-pointer focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 focus:outline-none ${activeTab === 'login' ? 'bg-orange-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}`}
            role="tab"
            aria-selected={activeTab === 'login'}
            aria-label="Switch to Sign In panel"
          >
            Sign In
          </button>
          <button
            onClick={() => { setActiveTab('register'); setErrMessage(''); }}
            className={`flex-1 text-center py-2 text-sm font-medium rounded-lg transition cursor-pointer focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 focus:outline-none ${activeTab === 'register' ? 'bg-orange-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}`}
            role="tab"
            aria-selected={activeTab === 'register'}
            aria-label="Switch to Sign Up panel"
          >
            Sign Up
          </button>
        </div>

        {errMessage && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-xl mb-4 flex items-start space-x-2" role="alert">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {activeTab === 'register' && (
            <div>
              <label htmlFor="auth-fullname" className="text-xs text-gray-400 font-mono uppercase block mb-1">Full Name</label>
              <input
                id="auth-fullname"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. David Weya"
                aria-label="Enter your full name"
                className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
          )}

          <div>
            <label htmlFor="auth-phone-email" className="text-xs text-gray-400 font-mono uppercase block mb-1">
              {activeTab === 'register' || phone ? 'Phone (+254...)' : 'Email or Phone'}
            </label>
            <div className="relative">
              <input
                id="auth-phone-email"
                type="text"
                required
                value={phone || email}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val.includes('@') || activeTab === 'login') {
                    if (val.includes('@')) {
                      setEmail(val);
                      setPhone('');
                    } else {
                      setPhone(val);
                      setEmail('');
                    }
                  } else {
                    setPhone(val);
                    setEmail('');
                  }
                }}
                placeholder={activeTab === 'register' ? '+254700000001' : 'Email or Phone number'}
                aria-label={activeTab === 'register' ? 'Enter phone number starting with prefix 254' : 'Enter registered email address or phone number'}
                className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label htmlFor="auth-password" className="text-xs text-gray-400 font-mono uppercase block mb-1">Password</label>
            <input
              id="auth-password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              aria-label="Enter account password"
              className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>

          {activeTab === 'register' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="auth-role" className="text-xs text-gray-400 font-mono uppercase block mb-1">Role</label>
                <select
                  id="auth-role"
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  aria-label="Select register role"
                  className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl py-3 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="customer">Customer</option>
                  <option value="fundi">Fundi (Trades)</option>
                </select>
              </div>

              {role === 'fundi' && (
                <div>
                  <label htmlFor="auth-trade" className="text-xs text-gray-400 font-mono uppercase block mb-1">Trade</label>
                  <select
                    id="auth-trade"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    aria-label="Select expert trade capability category"
                    className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl py-3 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  >
                    <option value="Plumbing">Plumbing</option>
                    <option value="Electrical">Electrical</option>
                    <option value="Construction">Construction</option>
                    <option value="Automotive">Automotive</option>
                    <option value="Cleaning">Cleaning</option>
                    <option value="Outdoor">Outdoor</option>
                    <option value="Specialized">Specialized</option>
                  </select>
                </div>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            aria-label={activeTab === 'login' ? 'Access Account Button' : 'Register Credentials Button'}
            className="w-full py-3.5 rounded-xl bg-orange-500 text-slate-950 font-bold hover:bg-orange-400 transition shadow-lg shadow-orange-500/20 active:translate-y-0.5 flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 focus:outline-none"
          >
            {loading ? (
              <span>Processing...</span>
            ) : activeTab === 'login' ? (
              <>
                <LogIn className="w-4 h-4" />
                <span>Access Account</span>
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                <span>Register Credentials</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
