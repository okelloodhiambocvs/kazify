import React from 'react';
import WalletTab from './WalletTab';
import { User } from '../types';

interface WalletManagerProps {
  user: User;
}

export default function WalletManager({ user }: WalletManagerProps) {
  return <WalletTab user={user} />;
}
export { WalletManager };
