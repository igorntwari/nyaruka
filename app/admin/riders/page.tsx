'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Star, Bike } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import SearchInput from '@/components/ui/SearchInput';
import Select from '@/components/ui/Select';
import AdminNav from '@/components/ui/AdminNav';
import { useStore, ApiError } from '@/lib/store';
import { useRequireRole } from '@/lib/useRequireRole';
import { apiFetch } from '@/lib/api';
import { RiderStatus, User } from '@/lib/types';

interface RiderRow extends User {
  deliveredCount: number;
  averageRating: number | null;
}

const STATUS_STYLE: Record<RiderStatus, string> = {
  PENDING: 'bg-amber-soft text-amber',
  VERIFIED: 'bg-route-mint text-route-deep',
  SUSPENDED: 'bg-danger/10 text-danger',
};

const STATUS_FILTER_OPTIONS = [
  { value: 'ALL', label: 'All statuses' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'VERIFIED', label: 'Verified' },
  { value: 'SUSPENDED', label: 'Suspended' },
];

export default function AdminRidersPage() {
  const { user, ready } = useRequireRole('ADMIN');
  const { token } = useStore();
  const [riders, setRiders] = useState<RiderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const data = await apiFetch<{ riders: RiderRow[] }>('/admin/riders', { token });
      setRiders(data.riders);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load riders.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (ready) load();
  }, [ready, load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return riders.filter((r) => {
      const status = r.riderProfile?.status ?? 'PENDING';
      if (statusFilter !== 'ALL' && status !== statusFilter) return false;
      if (q && !r.name.toLowerCase().includes(q) && !r.phone.includes(q)) return false;
      return true;
    });
  }, [riders, search, statusFilter]);

  if (!user) return null;

  async function setStatus(riderId: string, status: RiderStatus) {
    setBusyId(riderId);
    setError('');
    try {
      await apiFetch(`/admin/riders/${riderId}/verify`, { method: 'PATCH', token, body: { status } });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not update this rider.');
    } finally {
      setBusyId(null);
    }
  }

  const actions = (r: RiderRow) => {
    const status = r.riderProfile?.status ?? 'PENDING';
    return (
      <div className="flex gap-2">
        {status !== 'VERIFIED' && (
          <Button variant="secondary" className="!w-auto min-h-0 px-3 py-2 text-xs" onClick={() => setStatus(r.id, 'VERIFIED')} disabled={busyId === r.id}>
            Verify
          </Button>
        )}
        {status !== 'SUSPENDED' && (
          <Button variant="ghost" className="!w-auto min-h-0 px-3 py-2 text-xs" onClick={() => setStatus(r.id, 'SUSPENDED')} disabled={busyId === r.id}>
            Suspend
          </Button>
        )}
      </div>
    );
  };

  return (
    <main className="dash-shell px-6 pt-10 pb-28 lg:px-10">
      <p className="font-display font-bold text-2xl text-ink mb-6">Riders</p>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <SearchInput placeholder="Search by name or phone…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <div className="sm:w-56 shrink-0">
          <Select label="Status" hideLabel options={STATUS_FILTER_OPTIONS} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} />
        </div>
      </div>

      {error && <p className="font-body text-sm text-danger mb-4">{error}</p>}
      {loading && <p className="font-body text-sm text-ink-soft">Loading riders…</p>}
      {!loading && filtered.length === 0 && (
        <div className="text-center pt-16">
          <Bike className="mx-auto mb-3 text-ink/20" size={32} />
          <p className="font-body text-sm text-ink-soft">
            {riders.length === 0 ? 'No riders registered yet.' : 'No riders match your search.'}
          </p>
        </div>
      )}

      {filtered.length > 0 && (
        <>
          {/* Desktop / tablet: table */}
          <div className="hidden md:block overflow-x-auto rounded-card border border-ink/10 bg-white">
            <table className="w-full text-sm font-body">
              <thead>
                <tr className="bg-paper text-ink-soft text-xs uppercase tracking-wide">
                  <th className="text-left px-4 py-3">Name</th>
                  <th className="text-left px-4 py-3">Phone</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3">Deliveries</th>
                  <th className="text-left px-4 py-3">Rating</th>
                  <th className="text-left px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/10">
                {filtered.map((r) => {
                  const status = r.riderProfile?.status ?? 'PENDING';
                  return (
                    <tr key={r.id}>
                      <td className="px-4 py-3 font-semibold text-ink">{r.name}</td>
                      <td className="px-4 py-3 font-mono text-xs text-ink-soft">{r.phone}</td>
                      <td className="px-4 py-3">
                        <span className={`text-[11px] font-semibold uppercase tracking-wide px-2.5 py-1 rounded-full ${STATUS_STYLE[status]}`}>
                          {status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-ink-soft">{r.deliveredCount}</td>
                      <td className="px-4 py-3 text-ink-soft">
                        <span className="flex items-center gap-1">
                          <Star size={12} className="fill-amber text-amber" /> {r.averageRating ? r.averageRating.toFixed(1) : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3">{actions(r)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile: cards */}
          <div className="md:hidden space-y-3">
            {filtered.map((r) => {
              const status = r.riderProfile?.status ?? 'PENDING';
              return (
                <Card key={r.id}>
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-body font-semibold text-ink">{r.name}</p>
                      <p className="font-mono text-xs text-ink-soft">{r.phone}</p>
                    </div>
                    <span className={`font-body text-[11px] font-semibold uppercase tracking-wide px-2.5 py-1 rounded-full ${STATUS_STYLE[status]}`}>
                      {status}
                    </span>
                  </div>
                  <div className="flex gap-4 mb-3 font-body text-xs text-ink-soft">
                    <span>{r.deliveredCount} deliveries</span>
                    <span className="flex items-center gap-1">
                      <Star size={12} className="fill-amber text-amber" /> {r.averageRating ? r.averageRating.toFixed(1) : '—'}
                    </span>
                  </div>
                  {actions(r)}
                </Card>
              );
            })}
          </div>
        </>
      )}

      <AdminNav />
    </main>
  );
}
