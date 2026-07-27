'use client';

import { Home, Package, User } from 'lucide-react';
import DashNav from './DashNav';

export default function BusinessNav() {
  const items = [
    { href: '/business', label: 'Home', icon: Home },
    { href: '/business/history', label: 'History', icon: Package },
    { href: '/business/account', label: 'Account', icon: User },
  ];

  return <DashNav brand="Nyaruka Business" items={items} />;
}
