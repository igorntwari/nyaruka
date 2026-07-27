'use client';

import Link from 'next/link';
import { Plus } from 'lucide-react';
import Card from '@/components/ui/Card';
import RouteMini from '@/components/ui/RouteMini';
import BusinessNav from '@/components/ui/BusinessNav';
import { useStore } from '@/lib/store';
import { useRequireRole } from '@/lib/useRequireRole';

export default function BusinessHomePage() {
  const { user } = useRequireRole('BUSINESS');
  const { orders } = useStore();

  if (!user) return null;

  const activeOrders = orders.filter((o) => o.status !== 'DELIVERED' && o.status !== 'CANCELLED');
  const recent = orders.slice(0, 3);

  return (
    <main className="dash-shell px-6 pt-10 pb-28 lg:px-10">
      <p className="font-body text-ink-soft text-sm">{user.businessProfile?.businessName ?? 'Welcome'}</p>
      <p className="font-display font-bold text-2xl text-ink mb-8">Business dashboard</p>

      <Link href="/order/new" className="block mb-8">
        <div className="rounded-card bg-route text-paper p-6 flex items-center justify-between shadow-soft hover:bg-route-deep transition-colors">
          <div>
            <p className="font-display font-bold text-xl">New delivery request</p>
            <p className="font-body text-paper/80 text-sm mt-1">Send a rider to your customer.</p>
          </div>
          <span className="h-12 w-12 rounded-full bg-white/15 flex items-center justify-center shrink-0">
            <Plus size={26} />
          </span>
        </div>
      </Link>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <Card>
          <p className="font-body text-xs text-ink-soft mb-1">Active</p>
          <p className="font-display font-bold text-xl text-ink">{activeOrders.length}</p>
        </Card>
        <Card>
          <p className="font-body text-xs text-ink-soft mb-1">Total requests</p>
          <p className="font-display font-bold text-xl text-ink">{orders.length}</p>
        </Card>
      </div>

      <p className="font-body font-semibold text-ink mb-3">Recent requests</p>
      {recent.length === 0 && (
        <p className="font-body text-sm text-ink-soft">No delivery requests yet — your first one will show up here.</p>
      )}
      <div className="space-y-3">
        {recent.map((o) => (
          <Link key={o.id} href={o.payment?.status === 'SUCCESS' ? `/order/${o.id}/track` : `/order/${o.id}/pay`}>
            <Card>
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="font-body text-sm text-ink">{o.item}</p>
                  <p className="font-body text-xs text-ink-soft mt-0.5">{o.pickup} → {o.dropoff}</p>
                </div>
                <span className="font-mono text-sm text-ink-soft">{o.cost} RWF</span>
              </div>
              {o.status === 'CANCELLED' ? (
                <p className="font-body text-xs text-danger">Cancelled</p>
              ) : (
                <RouteMini status={o.status} />
              )}
            </Card>
          </Link>
        ))}
      </div>

      <BusinessNav />
    </main>
  );
}
