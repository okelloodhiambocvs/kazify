import React from 'react';
import { User } from '../../types';
import DashboardLayout from '../DashboardLayout';

export interface CustomerLayoutWrapperProps {
  isWrapped?: boolean;
  user: User;
  onLogout: () => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
  notifications: any[];
  unreadCount: number;
  onRefresh: () => void;
  children: React.ReactNode;
}

export default function CustomerLayoutWrapper({
  isWrapped,
  user,
  onLogout,
  activeTab,
  onTabChange,
  notifications,
  unreadCount,
  onRefresh,
  children
}: CustomerLayoutWrapperProps) {
  if (isWrapped) {
    return <div className="space-y-6 text-left">{children}</div>;
  }
  return (
    <DashboardLayout
      user={user}
      onLogout={onLogout}
      role="customer"
      title="Client Center"
      activeTab={activeTab}
      onTabChange={onTabChange}
      notifications={notifications}
      unreadCount={unreadCount}
      onRefresh={onRefresh}
    >
      {children}
    </DashboardLayout>
  );
}
