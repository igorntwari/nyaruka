'use client';

import { useEffect, useState } from 'react';
import { Wallet, Star } from 'lucide-react';
import Card from '@/components/ui/Card';
import RiderNav from '@/components/ui/RiderNav';
import { useStore, ApiError } from '@/lib/store';
import { useRequireRole } from '@/lib/useRequireRole';
import { apiFetch } from '@/lib/api';

interface Earnings {
  totalEarnings: number;
  deliveredCount: number;
  averageRating: number | null;
  ratingCount: number;
  deliveries: { id: string; riderPayout: number; deliveredAt: string; item: string; dropoff: string }[];
}

export default function RiderEarningsPage() {
  const { user, ready } = useRequireRole('RIDER');
  const { token } = useStore();
  const [data, setData] = useState<Earnings | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!ready || !token) return;
    apiFetch<Earnings>('/riders/earnings', { token })
      .then(setData)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load earnings.'));
  }, [ready, token]);

  if (!user) return null;

  return (
    <main className="dash-shell px-6 pt-10 pb-28 lg:px-10">
      <p className="font-display font-bold text-2xl text-ink mb-8">Earnings</p>

      {error && <p className="font-body text-sm text-danger mb-4">{error}</p>}
      {!data && !error && <p className="font-body text-sm text-ink-soft">Loading…</p>}

      {data && (
        <>
          <Card className="mb-6 bg-route text-paper">
            <div className="flex items-center gap-3 mb-1">
              <Wallet size={20} className="text-ink-soft" />
              <p className="font-body text-sm text-ink-soft">Total earnings</p>
            </div>
            <p className=" text-ink-soft font-mono text-3xl font-semibold">{data.totalEarnings} RWF</p>
          </Card>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <Card>
              <p className="font-body text-xs text-ink-soft mb-1">Deliveries</p>
              <p className="font-display font-bold text-xl text-ink">{data.deliveredCount}</p>
            </Card>
            <Card>
              <p className="font-body text-xs text-ink-soft mb-1 flex items-center gap-1">
                <Star size={12} className="fill-amber text-amber" /> Rating
              </p>
              <p className="font-display font-bold text-xl text-ink">
                {data.averageRating ? data.averageRating.toFixed(1) : '—'}
              </p>
            </Card>
          </div>

          <p className="font-body font-semibold text-ink mb-3">Recent deliveries</p>
          {data.deliveries.length === 0 && (
            <p className="font-body text-sm text-ink-soft">No completed deliveries yet.</p>
          )}

          {data.deliveries.length > 0 && (
            <>
              {/* Desktop / tablet: table */}
              <div className="hidden md:block overflow-x-auto rounded-card border border-ink/10 bg-white">
                <table className="w-full text-sm font-body">
                  <thead>
                    <tr className="bg-paper text-ink-soft text-xs uppercase tracking-wide">
                      <th className="text-left px-4 py-3">Item</th>
                      <th className="text-left px-4 py-3">Delivered to</th>
                      <th className="text-left px-4 py-3">Delivered at</th>
                      <th className="text-left px-4 py-3">Payout</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink/10">
                    {data.deliveries.map((d) => (
                      <tr key={d.id}>
                        <td className="px-4 py-3 font-semibold text-ink">{d.item}</td>
                        <td className="px-4 py-3 text-ink-soft text-xs">{d.dropoff}</td>
                        <td className="px-4 py-3 text-ink-soft text-xs">{new Date(d.deliveredAt).toLocaleDateString()}</td>
                        <td className="px-4 py-3 font-mono text-route font-semibold">{d.riderPayout} RWF</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile: cards */}
              <div className="md:hidden space-y-3">
                {data.deliveries.map((d) => (
                  <Card key={d.id} className="flex items-center justify-between py-4">
                    <div>
                      <p className="font-body text-sm text-ink">{d.item}</p>
                      <p className="font-body text-xs text-ink-soft mt-0.5">to {d.dropoff}</p>
                    </div>
                    <span className="font-mono text-sm text-route font-semibold">{d.riderPayout} RWF</span>
                  </Card>
                ))}
              </div>
            </>
          )}
        </>
      )}

      <RiderNav />
    </main>
  );
}
