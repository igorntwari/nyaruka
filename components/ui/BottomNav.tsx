'use client';

import { Home, Package, MapPin, User } from 'lucide-react';
import { useStore } from '@/lib/store';
import DashNav from './DashNav';

export default function BottomNav() {
  const { orders } = useStore();
  const activeOrder = orders.find((o) => o.status !== 'DELIVERED' && o.status !== 'CANCELLED');

  const items = [
    { href: '/home', label: 'Home', icon: Home },
    { href: '/history', label: 'Orders', icon: Package },
    { href: activeOrder ? `/order/${activeOrder.id}/track` : '/history', label: 'Track', icon: MapPin },
    { href: '/account', label: 'Account', icon: User },
  ];

  return <DashNav brand="Nyaruka" items={items} />;
}
