'use client';

import { useStore } from '@/lib/store';
import BottomNav from './BottomNav';
import RiderNav from './RiderNav';
import BusinessNav from './BusinessNav';

// Order detail screens (pay/track/rate) are shared between Customer and
// Business, so the bottom nav they render has to follow the viewer's role.
export default function RoleNav() {
  const { user } = useStore();
  if (!user) return null;
  if (user.role === 'RIDER') return <RiderNav />;
  if (user.role === 'BUSINESS') return <BusinessNav />;
  return <BottomNav />;
}
