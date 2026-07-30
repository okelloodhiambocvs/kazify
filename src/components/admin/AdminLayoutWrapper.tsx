import React from 'react';
import { User } from '../../types';
import DashboardLayout from '../DashboardLayout';

export interface AdminLayoutWrapperProps {
  isWrapped?: boolean;
  user: User;
  onLogout: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onRefresh: () => void;
  children: React.ReactNode;
}

export function AdminLayoutWrapper({
  isWrapped,
  user,
  onLogout,
  activeTab,
  setActiveTab,
  onRefresh,
  children
}: AdminLayoutWrapperProps) {
  if (isWrapped) {
    return <div className="space-y-6 text-left">{children}</div>;
  }
  return (
    <DashboardLayout
      user={user}
      onLogout={onLogout}
      role="admin"
      title="Global Tower"
      activeTab={activeTab}
      onTabChange={setActiveTab}
      notifications={[]}
      onRefresh={onRefresh}
    >
      {children}
    </DashboardLayout>
  );
}
