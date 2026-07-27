'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Package } from 'lucide-react';
import Card from '@/components/ui/Card';
import RouteMini from '@/components/ui/RouteMini';
import SearchInput from '@/components/ui/SearchInput';
import Select from '@/components/ui/Select';
import BottomNav from '@/components/ui/BottomNav';
import { useStore } from '@/lib/store';
import { STATUS_LABEL } from '@/lib/types';

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'All statuses' },
  { value: 'PLACED', label: 'Placed' },
  { value: 'ASSIGNED', label: 'Assigned' },
  { value: 'PICKED_UP', label: 'Picked up' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

export default function HistoryPage() {
  const { orders } = useStore();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter((o) => {
      if (statusFilter !== 'ALL' && o.status !== statusFilter) return false;
      if (q && !o.item.toLowerCase().includes(q) && !o.pickup.toLowerCase().includes(q) && !o.dropoff.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [orders, search, statusFilter]);

  return (
    <main className="dash-shell px-6 pt-10 pb-28 lg:px-10">
      <p className="font-display font-bold text-2xl text-ink mb-6">Your orders</p>

      {orders.length === 0 ? (
        <div className="text-center pt-16">
          <p className="font-body text-ink-soft text-sm">No deliveries yet.</p>
          <Link href="/order/new" className="text-route font-semibold font-body text-sm">Place your first order</Link>
        </div>
      ) : (
        <>
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <SearchInput placeholder="Search by item or address…" value={search} onChange={(e) => setSearch(e.target.value)} />
            <div className="sm:w-56 shrink-0">
              <Select label="Status" hideLabel options={STATUS_OPTIONS} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} />
            </div>
          </div>

          {filtered.length === 0 && (
            <div className="text-center pt-16">
              <Package className="mx-auto mb-3 text-ink/20" size={32} />
              <p className="font-body text-sm text-ink-soft">No orders match your search.</p>
            </div>
          )}

          {/* Desktop / tablet: table */}
          {filtered.length > 0 && (
            <div className="hidden md:block overflow-x-auto rounded-card border border-ink/10 bg-white mb-6">
              <table className="w-full text-sm font-body">
                <thead>
                  <tr className="bg-paper text-ink-soft text-xs uppercase tracking-wide">
                    <th className="text-left px-4 py-3">Order</th>
                    <th className="text-left px-4 py-3">Route</th>
                    <th className="text-left px-4 py-3">Cost</th>
                    <th className="text-left px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink/10">
                  {filtered.map((o) => {
                    const paid = o.payment?.status === 'SUCCESS';
                    return (
                      <tr key={o.id} className="cursor-pointer hover:bg-paper/60">
                        <td className="px-4 py-3">
                          <Link href={paid ? `/order/${o.id}/track` : `/order/${o.id}/pay`} className="block">
                            <p className="font-semibold text-ink">{o.item}</p>
                            <p className="font-mono text-[11px] text-ink-soft">{o.id.slice(0, 10).toUpperCase()}</p>
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-ink-soft text-xs">{o.pickup} → {o.dropoff}</td>
                        <td className="px-4 py-3 font-mono text-ink">{o.cost} RWF</td>
                        <td className="px-4 py-3">
                          {o.status === 'CANCELLED' ? (
                            <span className="text-danger text-xs">Cancelled</span>
                          ) : (
                            <span className="text-ink-soft text-xs">{STATUS_LABEL[o.status]}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Mobile: cards */}
          <div className="md:hidden space-y-4">
            {filtered.map((o) => {
              const paid = o.payment?.status === 'SUCCESS';
              return (
                <Link key={o.id} href={paid ? `/order/${o.id}/track` : `/order/${o.id}/pay`}>
                  <Card>
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="font-body text-xs text-ink-soft uppercase tracking-wide">{o.id.slice(0, 10).toUpperCase()}</p>
                        <p className="font-body font-semibold text-ink">{o.item}</p>
                      </div>
                      <span className="font-mono text-sm text-ink font-semibold">{o.cost} RWF</span>
                    </div>
                    {o.status === 'CANCELLED' ? (
                      <p className="font-body text-xs text-danger">Cancelled</p>
                    ) : (
                      <>
                        <RouteMini status={o.status} />
                        <p className="font-body text-xs text-ink-soft mt-2">{STATUS_LABEL[o.status]}</p>
                      </>
                    )}
                  </Card>
                </Link>
              );
            })}
          </div>
        </>
      )}

      <BottomNav />
    </main>
  );
}
