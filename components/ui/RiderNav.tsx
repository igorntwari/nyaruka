'use client';

import { Briefcase, Wallet, User } from 'lucide-react';
import DashNav from './DashNav';

export default function RiderNav() {
  const items = [
    { href: '/rider', label: 'Jobs', icon: Briefcase },
    { href: '/rider/earnings', label: 'Earnings', icon: Wallet },
    { href: '/rider/account', label: 'Account', icon: User },
  ];

  return <DashNav brand="Nyaruka Rider" items={items} />;
}
