'use client';

import { useEffect, useState } from 'react';
import { Truck, Wallet, Bike, Star, Users, Briefcase, PackageX, ListOrdered } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import Card from '@/components/ui/Card';
import AdminNav from '@/components/ui/AdminNav';
import { useStore, ApiError } from '@/lib/store';
import { useRequireRole } from '@/lib/useRequireRole';
import { apiFetch } from '@/lib/api';
import { AdminStats, MonthlyStat, ZONE_LABEL, STATUS_LABEL, OrderStatus } from '@/lib/types';

const ROUTE_GREEN = '#0F6B4C';
const AMBER = '#C98A1F';
const BLUE = '#2E6F9E';
const PLUM = '#8B5FA6';
const DANGER = '#B23A2E';
const INK_SOFT = '#4B5A52';

const STATUS_COLOR: Record<OrderStatus, string> = {
  DELIVERED: ROUTE_GREEN,
  CANCELLED: DANGER,
  PLACED: AMBER,
  ASSIGNED: AMBER,
  PICKED_UP: AMBER,
};

function tooltipStyle() {
  return { borderRadius: 12, border: '1px solid rgba(22,36,29,0.1)', fontSize: 12 } as const;
}

interface MiniBarChartProps {
  data: MonthlyStat[];
  dataKey: 'deliveries' | 'revenue' | 'averageRating' | 'newRiders' | 'newCustomers';
  color: string;
  unit?: string;
}

function MiniBarChart({ data, dataKey, color, unit }: MiniBarChartProps) {
  return (
    <div className="h-40">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(22,36,29,0.08)" vertical={false} />
          <XAxis dataKey="month" tick={{ fontSize: 10, fill: INK_SOFT }} axisLine={false} tickLine={false} />
          <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: INK_SOFT }} axisLine={false} tickLine={false} width={28} />
          <Tooltip
            cursor={{ fill: 'rgba(15,107,76,0.06)' }}
            contentStyle={tooltipStyle()}
            formatter={(value) => [`${value}${unit ? ' ' + unit : ''}`, '']}
            labelStyle={{ fontWeight: 600 }}
          />
          <Bar dataKey={dataKey} fill={color} radius={[4, 4, 0, 0]} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function AdminStatsPage() {
  const { user, ready } = useRequireRole('ADMIN');
  const { token } = useStore();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!ready || !token) return;
    apiFetch<AdminStats>('/admin/stats', { token })
      .then(setStats)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load stats.'));
  }, [ready, token]);

  if (!user) return null;

  const zoneData = (stats?.busiestZones ?? []).map((z) => ({ zone: ZONE_LABEL[z.zone], count: z.count }));
  const statusData = (stats?.ordersByStatus ?? []).map((s) => ({ status: STATUS_LABEL[s.status], count: s.count, key: s.status }));

  return (
    <main className="dash-shell px-6 pt-10 pb-28 lg:px-10">
      <p className="font-display font-bold text-2xl text-ink mb-1">Stats & reporting</p>
      <p className="font-body text-ink-soft text-sm mb-6">Platform overview and month-over-month trends.</p>

      {error && <p className="font-body text-sm text-danger mb-4">{error}</p>}
      {!stats && !error && <p className="font-body text-sm text-ink-soft">Loading…</p>}

      {stats && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-8">
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
              <p className="font-display font-bold text-xl text-ink">
                {stats.activeRiders} <span className="text-sm font-body font-normal text-ink-soft">/ {stats.totalRiders}</span>
              </p>
            </Card>
            <Card>
              <div className="flex items-center gap-2 mb-1 text-ink-soft">
                <Users size={14} />
                <p className="font-body text-xs">Customers</p>
              </div>
              <p className="font-display font-bold text-xl text-ink">{stats.totalCustomers}</p>
            </Card>
            <Card>
              <div className="flex items-center gap-2 mb-1 text-ink-soft">
                <Briefcase size={14} />
                <p className="font-body text-xs">Businesses</p>
              </div>
              <p className="font-display font-bold text-xl text-ink">{stats.totalBusinesses}</p>
            </Card>
            <Card>
              <div className="flex items-center gap-2 mb-1 text-ink-soft">
                <Star size={14} />
                <p className="font-body text-xs">Avg. rating</p>
              </div>
              <p className="font-display font-bold text-xl text-ink">{stats.averageRating ? stats.averageRating.toFixed(1) : '—'}</p>
            </Card>
            <Card>
              <div className="flex items-center gap-2 mb-1 text-ink-soft">
                <ListOrdered size={14} />
                <p className="font-body text-xs">Total orders</p>
              </div>
              <p className="font-display font-bold text-xl text-ink">{stats.totalOrders}</p>
            </Card>
            <Card>
              <div className="flex items-center gap-2 mb-1 text-ink-soft">
                <PackageX size={14} />
                <p className="font-body text-xs">Cancelled</p>
              </div>
              <p className="font-display font-bold text-xl text-ink">{stats.cancelledOrders}</p>
            </Card>
            <Card>
              <div className="flex items-center gap-2 mb-1 text-ink-soft">
                <Bike size={14} />
                <p className="font-body text-xs">Pending / Suspended</p>
              </div>
              <p className="font-display font-bold text-xl text-ink">{stats.pendingRiders} / {stats.suspendedRiders}</p>
            </Card>
          </div>

          <p className="font-body font-semibold text-ink mb-3">Monthly trends (last 6 months)</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
            <Card>
              <p className="font-body text-xs text-ink-soft mb-2">Deliveries</p>
              <MiniBarChart data={stats.monthly} dataKey="deliveries" color={ROUTE_GREEN} />
            </Card>
            <Card>
              <p className="font-body text-xs text-ink-soft mb-2">Revenue (RWF)</p>
              <MiniBarChart data={stats.monthly} dataKey="revenue" color={AMBER} />
            </Card>
            <Card>
              <p className="font-body text-xs text-ink-soft mb-2">Average rating</p>
              <MiniBarChart data={stats.monthly} dataKey="averageRating" color={AMBER} />
            </Card>
            <Card>
              <p className="font-body text-xs text-ink-soft mb-2">New riders</p>
              <MiniBarChart data={stats.monthly} dataKey="newRiders" color={BLUE} />
            </Card>
            <Card>
              <p className="font-body text-xs text-ink-soft mb-2">New customers</p>
              <MiniBarChart data={stats.monthly} dataKey="newCustomers" color={PLUM} />
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <div>
              <p className="font-body font-semibold text-ink mb-3">Orders by status</p>
              <Card>
                {statusData.length === 0 ? (
                  <p className="font-body text-sm text-ink-soft py-6 text-center">No orders yet.</p>
                ) : (
                  <div className="h-64 -ml-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={statusData} layout="vertical" margin={{ left: 8, right: 16 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(22,36,29,0.08)" horizontal={false} />
                        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: INK_SOFT }} axisLine={false} tickLine={false} />
                        <YAxis type="category" dataKey="status" width={90} tick={{ fontSize: 12, fill: INK_SOFT }} axisLine={false} tickLine={false} />
                        <Tooltip cursor={{ fill: 'rgba(15,107,76,0.06)' }} contentStyle={tooltipStyle()} formatter={(value) => [`${value} orders`, '']} labelStyle={{ fontWeight: 600 }} />
                        <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={22}>
                          {statusData.map((s) => (
                            <Cell key={s.key} fill={STATUS_COLOR[s.key as OrderStatus]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </Card>
            </div>

            <div>
              <p className="font-body font-semibold text-ink mb-3">Busiest delivery zones</p>
              <Card>
                {zoneData.length === 0 ? (
                  <p className="font-body text-sm text-ink-soft py-6 text-center">No delivered orders yet.</p>
                ) : (
                  <div className="h-64 -ml-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={zoneData} layout="vertical" margin={{ left: 8, right: 16 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(22,36,29,0.08)" horizontal={false} />
                        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: INK_SOFT }} axisLine={false} tickLine={false} />
                        <YAxis type="category" dataKey="zone" width={100} tick={{ fontSize: 12, fill: INK_SOFT }} axisLine={false} tickLine={false} />
                        <Tooltip cursor={{ fill: 'rgba(15,107,76,0.06)' }} contentStyle={tooltipStyle()} formatter={(value) => [`${value} deliveries`, '']} labelStyle={{ fontWeight: 600 }} />
                        <Bar dataKey="count" fill={ROUTE_GREEN} radius={[0, 4, 4, 0]} maxBarSize={22} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </Card>
            </div>
          </div>
        </>
      )}

      <AdminNav />
    </main>
  );
}
