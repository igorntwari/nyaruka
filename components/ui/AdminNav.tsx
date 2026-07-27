'use client';

import { LayoutDashboard, Bike, Package, BarChart3 } from 'lucide-react';
import DashNav from './DashNav';

export default function AdminNav() {
  const items = [
    { href: '/admin', label: 'Overview', icon: LayoutDashboard },
    { href: '/admin/riders', label: 'Riders', icon: Bike },
    { href: '/admin/orders', label: 'Orders', icon: Package },
    { href: '/admin/stats', label: 'Stats', icon: BarChart3 },
  ];

  return <DashNav brand="Nyaruka Admin" items={items} />;
}
