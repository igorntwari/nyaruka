'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Truck, Wallet, Bike, Star } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import AdminNav from '@/components/ui/AdminNav';
import { useStore, ApiError } from '@/lib/store';
import { useRequireRole } from '@/lib/useRequireRole';
import { apiFetch } from '@/lib/api';
import { AdminStats } from '@/lib/types';

export default function AdminOverviewPage() {
  const router = useRouter();
  const { user, ready } = useRequireRole('ADMIN');
  const { token, logout } = useStore();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!ready || !token) return;
    apiFetch<AdminStats>('/admin/stats', { token })
      .then(setStats)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load stats.'));
  }, [ready, token]);

  if (!user) return null;

  return (
    <main className="dash-shell px-6 pt-10 pb-28 lg:px-10">
      <div className="flex items-start justify-between mb-8">
        <div>
          <p className="font-body text-ink-soft text-sm">Muraho,</p>
          <p className="font-display font-bold text-2xl text-ink">{user.name.split(' ')[0]}</p>
        </div>
        <Button
          variant="ghost"
          className="!w-auto min-h-0 px-0 text-sm"
          onClick={() => {
            logout();
            router.replace('/');
          }}
        >
          Log out
        </Button>
      </div>

      {error && <p className="font-body text-sm text-danger mb-4">{error}</p>}

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <div className="flex items-center gap-2 mb-1 text-ink-soft">
              <Truck size={14} />
              <p className="font-body text-xs">Deliveries</p>
            </div>
            <p className="font-display font-bold text-xl text-ink">{stats.totalDeliveries}</p>
          </Card>
          <Card>
            <div className="flex items-center gap-2 mb-1 text-ink-soft">
              <Wallet size={14} />
              <p className="font-body text-xs">Revenue</p>
            </div>
            <p className="font-display font-bold text-xl text-ink">{stats.totalRevenue.toLocaleString()} RWF</p>
          </Card>
          <Card>
            <div className="flex items-center gap-2 mb-1 text-ink-soft">
              <Bike size={14} />
              <p className="font-body text-xs">Active riders</p>
            </div>
            <p className="font-display font-bold text-xl text-ink">{stats.activeRiders}</p>
          </Card>
          <Card>
            <div className="flex items-center gap-2 mb-1 text-ink-soft">
              <Star size={14} />
              <p className="font-body text-xs">Avg. rating</p>
            </div>
            <p className="font-display font-bold text-xl text-ink">{stats.averageRating ? stats.averageRating.toFixed(1) : '—'}</p>
          </Card>
        </div>
      )}

      <AdminNav />
    </main>
  );
}
