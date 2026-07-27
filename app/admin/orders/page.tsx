'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Package } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import SearchInput from '@/components/ui/SearchInput';
import AdminNav from '@/components/ui/AdminNav';
import { useStore, ApiError } from '@/lib/store';
import { useRequireRole } from '@/lib/useRequireRole';
import { apiFetch } from '@/lib/api';
import { Order, STATUS_LABEL, ZONE_LABEL, ZONES, User, OrderStatus } from '@/lib/types';

interface RiderRow extends User {
  deliveredCount: number;
}

const STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Active (not delivered/cancelled)' },
  { value: 'ALL', label: 'All statuses' },
  { value: 'PLACED', label: 'Placed' },
  { value: 'ASSIGNED', label: 'Assigned' },
  { value: 'PICKED_UP', label: 'Picked up' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const ZONE_FILTER_OPTIONS = [{ value: 'ALL', label: 'All zones' }, ...ZONES.map((z) => ({ value: z, label: ZONE_LABEL[z] }))];

export default function AdminOrdersPage() {
  const { user, ready } = useRequireRole('ADMIN');
  const { token } = useStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [riders, setRiders] = useState<RiderRow[]>([]);
  const [selectedRider, setSelectedRider] = useState<{ [orderId: string]: string }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ACTIVE');
  const [zoneFilter, setZoneFilter] = useState('ALL');

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const query = statusFilter === 'ACTIVE' ? '' : statusFilter === 'ALL' ? '?status=ALL' : `?status=${statusFilter}`;
      const [ordersData, ridersData] = await Promise.all([
        apiFetch<{ orders: Order[] }>(`/admin/orders${query}`, { token }),
        apiFetch<{ riders: RiderRow[] }>('/admin/riders', { token }),
      ]);
      setOrders(ordersData.orders);
      setRiders(ridersData.riders.filter((r) => r.riderProfile?.status === 'VERIFIED'));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load orders.');
    } finally {
      setLoading(false);
    }
  }, [token, statusFilter]);

  useEffect(() => {
    if (ready) load();
  }, [ready, load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter((o) => {
      if (zoneFilter !== 'ALL' && o.pickupZone !== zoneFilter && o.dropoffZone !== zoneFilter) return false;
      if (q && !o.item.toLowerCase().includes(q) && !o.customer?.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [orders, search, zoneFilter]);

  if (!user) return null;

  async function assign(orderId: string) {
    const riderId = selectedRider[orderId];
    if (!riderId) return;
    setBusyId(orderId);
    setError('');
    try {
      await apiFetch(`/admin/orders/${orderId}/assign`, { method: 'PATCH', token, body: { riderId } });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not assign a rider.');
    } finally {
      setBusyId(null);
    }
  }

  const assignControl = (o: Order) => {
    const needsRider = !o.riderId && o.payment?.status === 'SUCCESS';
    if (!needsRider) return null;
    return (
      <div className="flex gap-2 items-center">
        <select
          className="min-h-[36px] rounded-xl border border-ink/10 px-2 font-body text-xs text-ink bg-white outline-none focus:border-route"
          value={selectedRider[o.id] ?? ''}
          onChange={(e) => setSelectedRider((prev) => ({ ...prev, [o.id]: e.target.value }))}
        >
          <option value="" disabled>Choose rider</option>
          {riders.map((r) => (
            <option key={r.id} value={r.id}>{r.name} ({r.deliveredCount})</option>
          ))}
        </select>
        <Button className="!w-auto min-h-0 px-3 py-2 text-xs" onClick={() => assign(o.id)} disabled={busyId === o.id || !selectedRider[o.id]}>
          {busyId === o.id ? 'Assigning…' : 'Assign'}
        </Button>
      </div>
    );
  };

  return (
    <main className="dash-shell px-6 pt-10 pb-28 lg:px-10">
      <p className="font-display font-bold text-2xl text-ink mb-1">Orders</p>
      <p className="font-body text-ink-soft text-sm mb-6">Search, filter, and manually assign riders.</p>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <SearchInput placeholder="Search by item or customer…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <div className="sm:w-64 shrink-0">
          <Select label="Status" hideLabel options={STATUS_OPTIONS} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} />
        </div>
        <div className="sm:w-48 shrink-0">
          <Select label="Zone" hideLabel options={ZONE_FILTER_OPTIONS} value={zoneFilter} onChange={(e) => setZoneFilter(e.target.value)} />
        </div>
      </div>

      {error && <p className="font-body text-sm text-danger mb-4">{error}</p>}
      {loading && <p className="font-body text-sm text-ink-soft">Loading orders…</p>}
      {!loading && filtered.length === 0 && (
        <div className="text-center pt-16">
          <Package className="mx-auto mb-3 text-ink/20" size={32} />
          <p className="font-body text-sm text-ink-soft">{orders.length === 0 ? 'No orders match this filter.' : 'No orders match your search.'}</p>
        </div>
      )}

      {filtered.length > 0 && (
        <>
          {/* Desktop / tablet: table */}
          <div className="hidden md:block overflow-x-auto rounded-card border border-ink/10 bg-white">
            <table className="w-full text-sm font-body">
              <thead>
                <tr className="bg-paper text-ink-soft text-xs uppercase tracking-wide">
                  <th className="text-left px-4 py-3">Order</th>
                  <th className="text-left px-4 py-3">Customer</th>
                  <th className="text-left px-4 py-3">Route</th>
                  <th className="text-left px-4 py-3">Cost</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3">Rider</th>
                  <th className="text-left px-4 py-3">Assign</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/10">
                {filtered.map((o) => (
                  <tr key={o.id}>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-ink">{o.item}</p>
                      <p className="font-mono text-[11px] text-ink-soft">{o.id.slice(0, 10).toUpperCase()}</p>
                    </td>
                    <td className="px-4 py-3 text-ink-soft">{o.customer?.name}</td>
                    <td className="px-4 py-3 text-ink-soft text-xs">{ZONE_LABEL[o.pickupZone]} → {ZONE_LABEL[o.dropoffZone]}</td>
                    <td className="px-4 py-3 font-mono text-ink">{o.cost} RWF</td>
                    <td className="px-4 py-3">
                      <span className="text-ink-soft text-xs">
                        {STATUS_LABEL[o.status]}
                        {!o.payment && ' · unpaid'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-ink-soft">{o.rider?.name ?? '—'}</td>
                    <td className="px-4 py-3">{assignControl(o) ?? <span className="text-ink-soft text-xs">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile: cards */}
          <div className="md:hidden space-y-3">
            {filtered.map((o) => (
              <Card key={o.id}>
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-body text-xs text-ink-soft uppercase tracking-wide">{o.id.slice(0, 10).toUpperCase()}</p>
                    <p className="font-body font-semibold text-ink">{o.item}</p>
                  </div>
                  <span className="font-mono text-sm text-ink font-semibold">{o.cost} RWF</span>
                </div>
                <p className="font-body text-xs text-ink-soft mb-1">
                  {o.customer?.name} · {ZONE_LABEL[o.pickupZone]} → {ZONE_LABEL[o.dropoffZone]}
                </p>
                <p className="font-body text-xs text-ink-soft mb-3">
                  {STATUS_LABEL[o.status]}
                  {o.rider ? ` · ${o.rider.name}` : ''}
                  {!o.payment && ' · unpaid'}
                </p>
                {assignControl(o)}
              </Card>
            ))}
          </div>
        </>
      )}

      <AdminNav />
    </main>
  );
}
