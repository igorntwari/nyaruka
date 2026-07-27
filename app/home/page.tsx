'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import Card from '@/components/ui/Card';
import RouteMini from '@/components/ui/RouteMini';
import BottomNav from '@/components/ui/BottomNav';
import { useStore } from '@/lib/store';
import { STATUS_LABEL } from '@/lib/types';

export default function HomePage() {
  const router = useRouter();
  const { user, hydrated, orders } = useStore();

  useEffect(() => {
  if (!hydrated) return;
  if (!user) router.replace('/');
  else if (user.role !== 'CUSTOMER') router.replace('/' + user.role.toLowerCase());
  }, [user, hydrated, router]);

  if (!user || user.role !== 'CUSTOMER') return null;

  const activeOrder = orders.find((o) => o.status !== 'DELIVERED' && o.status !== 'CANCELLED');
  const recent = orders.slice(0, 3);

  return (
  <main className="dash-shell px-6 pt-10 pb-28 lg:px-10">
  <p className="font-body text-ink-soft text-sm">Muraho,</p>
  <p className="font-display font-bold text-2xl text-ink mb-8">{user.name.split(' ')[0]}</p>

  <Link href="/order/new" className="block mb-8">
    <div className="rounded-card bg-route text-paper p-6 flex items-center justify-between shadow-soft hover:bg-route-deep transition-colors">
    <div>
    <p className="font-display font-bold text-xl">Place a delivery</p>
    <p className="font-body text-paper/80 text-sm mt-1">Pickup, drop-off, done.</p>
    </div>
    <span className="h-12 w-12 rounded-full bg-white/15 flex items-center justify-center shrink-0">
    <Plus size={26} />
    </span>
    </div>
  </Link>

  {activeOrder && (
    <Link href={`/order/${activeOrder.id}/track`} className="block mb-8">
    <Card className="border border-route/15">
    <div className="flex justify-between items-start mb-3">
      <div>
      <p className="font-body text-xs text-ink-soft uppercase tracking-wide">In progress · {activeOrder.id}</p>
      <p className="font-display font-semibold text-ink mt-0.5">{STATUS_LABEL[activeOrder.status]}</p>
      </div>
      <span className="font-mono text-sm text-route font-semibold">{activeOrder.cost} RWF</span>
    </div>
    <RouteMini status={activeOrder.status} />
    </Card>
    </Link>
  )}

  <p className="font-body font-semibold text-ink mb-3">Recent orders</p>
  {recent.length === 0 && (
    <p className="font-body text-sm text-ink-soft">No orders yet your first delivery will show up here.</p>
  )}
  <div className="space-y-3">
    {recent.map((o) => (
    <Link key={o.id} href={`/order/${o.id}/track`}>
    <Card className="flex items-center justify-between py-4">
      <div>
      <p className="font-body text-sm text-ink">{o.item}</p>
      <p className="font-body text-xs text-ink-soft mt-0.5">{o.pickup} → {o.dropoff}</p>
      </div>
      <span className="font-mono text-sm text-ink-soft">{o.cost} RWF</span>
    </Card>
    </Link>
    ))}
  </div>

  <BottomNav />
  </main>
  );
}
