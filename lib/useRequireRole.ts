'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from './store';
import { Role } from './types';

const ROLE_HOME: Record<Role, string> = {
  CUSTOMER: '/home',
  RIDER: '/rider',
  BUSINESS: '/business',
  ADMIN: '/admin',
};

export function useRequireRole(role: Role) {
  const router = useRouter();
  const { user, hydrated } = useStore();

  useEffect(() => {
    if (!hydrated) return;
    if (!user) router.replace('/');
    else if (user.role !== role) router.replace(ROLE_HOME[user.role]);
  }, [user, hydrated, role, router]);

  const ready = hydrated && !!user && user.role === role;
  return { user: ready ? user : null, ready };
}
