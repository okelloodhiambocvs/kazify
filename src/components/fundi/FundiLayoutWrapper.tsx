import React from 'react';
import { User } from '../../types';
import DashboardLayout from '../DashboardLayout';

export interface FundiLayoutWrapperProps {
  isWrapped?: boolean;
  user: User;
  onLogout: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  notifications: any[];
  onRefresh: () => void;
  children: React.ReactNode;
}

export default function FundiLayoutWrapper({
  isWrapped,
  user,
  onLogout,
  activeTab,
  setActiveTab,
  notifications,
  onRefresh,
  children
}: FundiLayoutWrapperProps) {
  if (isWrapped) {
    return <div className="space-y-6 text-left">{children}</div>;
  }
  return (
    <DashboardLayout
      user={user}
      onLogout={onLogout}
      role="fundi"
      title="Trades Expert"
      activeTab={activeTab}
      onTabChange={setActiveTab}
      notifications={notifications}
      unreadCount={(notifications || []).length}
      onRefresh={onRefresh}
    >
      {children}
    </DashboardLayout>
  );
}
