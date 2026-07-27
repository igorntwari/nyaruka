'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Package } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import SearchInput from '@/components/ui/SearchInput';
import Select from '@/components/ui/Select';
import RiderNav from '@/components/ui/RiderNav';
import { useStore, ApiError } from '@/lib/store';
import { useRequireRole } from '@/lib/useRequireRole';
import { apiFetch } from '@/lib/api';
import { Order, ZONE_LABEL, ZONES } from '@/lib/types';

const ZONE_FILTER_OPTIONS = [{ value: 'ALL', label: 'All zones' }, ...ZONES.map((z) => ({ value: z, label: ZONE_LABEL[z] }))];

export default function RiderHomePage() {
  const { user, ready } = useRequireRole('RIDER');
  const { token } = useStore();
  const [jobs, setJobs] = useState<Order[]>([]);
  const [myJobs, setMyJobs] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [zoneFilter, setZoneFilter] = useState('ALL');

  const verified = user?.riderProfile?.status === 'VERIFIED';

  const load = useCallback(async () => {
    if (!token) return;
    setError('');
    try {
      const [jobsData, mineData] = await Promise.all([
        verified ? apiFetch<{ jobs: Order[] }>('/riders/jobs', { token }) : Promise.resolve({ jobs: [] }),
        apiFetch<{ orders: Order[] }>('/riders/my-jobs', { token }),
      ]);
      setJobs(jobsData.jobs);
      setMyJobs(mineData.orders);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load jobs.');
    } finally {
      setLoading(false);
    }
  }, [token, verified]);

  useEffect(() => {
    if (!ready) return;
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [ready, load]);

  const filteredJobs = useMemo(() => {
    const q = search.trim().toLowerCase();
    return jobs.filter((o) => {
      if (zoneFilter !== 'ALL' && o.pickupZone !== zoneFilter && o.dropoffZone !== zoneFilter) return false;
      if (q && !o.item.toLowerCase().includes(q) && !o.pickup.toLowerCase().includes(q) && !o.dropoff.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [jobs, search, zoneFilter]);

  if (!user) return null;

  const pending = user.riderProfile?.status === 'PENDING';
  const suspended = user.riderProfile?.status === 'SUSPENDED';

  async function acceptJob(id: string) {
    setBusyId(id);
    setError('');
    try {
      await apiFetch(`/riders/jobs/${id}/accept`, { method: 'POST', token });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not accept this job.');
    } finally {
      setBusyId(null);
    }
  }

  async function advanceStatus(order: Order) {
    const next = order.status === 'ASSIGNED' ? 'PICKED_UP' : 'DELIVERED';
    setBusyId(order.id);
    setError('');
    try {
      await apiFetch(`/riders/jobs/${order.id}/status`, { method: 'PATCH', token, body: { status: next } });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not update this job.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="dash-shell px-6 pt-10 pb-28 lg:px-10">
      <p className="font-body text-ink-soft text-sm">Muraho,</p>
      <p className="font-display font-bold text-2xl text-ink mb-8">{user.name.split(' ')[0]}</p>

      {pending && (
        <Card className="mb-6 border border-amber/30 bg-amber-soft">
          <p className="font-body text-sm text-ink">
            Your rider account is awaiting admin verification. You&apos;ll see available jobs once you&apos;re verified.
          </p>
        </Card>
      )}
      {suspended && (
        <Card className="mb-6 border border-danger/30">
          <p className="font-body text-sm text-danger">Your rider account has been suspended. Contact support.</p>
        </Card>
      )}

      {error && <p className="font-body text-sm text-danger mb-4">{error}</p>}

      {!pending && !suspended && myJobs.length > 0 && (
        <>
          <p className="font-body font-semibold text-ink mb-3">Your active deliveries</p>
          <div className="grid gap-3 mb-8 md:grid-cols-2 lg:grid-cols-3">
            {myJobs.map((o) => (
              <Card key={o.id} className="border border-route/15">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-body text-xs text-ink-soft uppercase tracking-wide">{o.id.slice(0, 10).toUpperCase()}</p>
                    <p className="font-body font-semibold text-ink">{o.item}</p>
                  </div>
                  <span className="font-mono text-sm text-route font-semibold">{o.riderPayout} RWF</span>
                </div>
                <p className="font-body text-xs text-ink-soft mb-3">
                  {ZONE_LABEL[o.pickupZone]} → {ZONE_LABEL[o.dropoffZone]}
                </p>
                <Button onClick={() => advanceStatus(o)} disabled={busyId === o.id}>
                  {busyId === o.id ? 'Updating…' : o.status === 'ASSIGNED' ? 'Mark picked up' : 'Mark delivered'}
                </Button>
              </Card>
            ))}
          </div>
        </>
      )}

      {!pending && !suspended && (
        <>
          <p className="font-body font-semibold text-ink mb-3">Available jobs</p>

          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <SearchInput placeholder="Search by item or address…" value={search} onChange={(e) => setSearch(e.target.value)} />
            <div className="sm:w-56 shrink-0">
              <Select label="Zone" hideLabel options={ZONE_FILTER_OPTIONS} value={zoneFilter} onChange={(e) => setZoneFilter(e.target.value)} />
            </div>
          </div>

          {loading && <p className="font-body text-sm text-ink-soft">Loading jobs…</p>}
          {!loading && filteredJobs.length === 0 && (
            <div className="text-center pt-10">
              <Package className="mx-auto mb-3 text-ink/20" size={32} />
              <p className="font-body text-sm text-ink-soft">
                {jobs.length === 0 ? 'No jobs available right now. Check back soon.' : 'No jobs match your search.'}
              </p>
            </div>
          )}

          {filteredJobs.length > 0 && (
            <>
              {/* Desktop / tablet: table */}
              <div className="hidden md:block overflow-x-auto rounded-card border border-ink/10 bg-white">
                <table className="w-full text-sm font-body">
                  <thead>
                    <tr className="bg-paper text-ink-soft text-xs uppercase tracking-wide">
                      <th className="text-left px-4 py-3">Item</th>
                      <th className="text-left px-4 py-3">Route</th>
                      <th className="text-left px-4 py-3">Payout</th>
                      <th className="text-left px-4 py-3">Accept</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink/10">
                    {filteredJobs.map((o) => (
                      <tr key={o.id}>
                        <td className="px-4 py-3 font-semibold text-ink">{o.item}</td>
                        <td className="px-4 py-3 text-ink-soft text-xs">
                          {o.pickup} ({ZONE_LABEL[o.pickupZone]}) → {o.dropoff} ({ZONE_LABEL[o.dropoffZone]})
                        </td>
                        <td className="px-4 py-3 font-mono text-route font-semibold">{o.riderPayout} RWF</td>
                        <td className="px-4 py-3">
                          <Button variant="secondary" className="!w-auto min-h-0 px-3 py-2 text-xs" onClick={() => acceptJob(o.id)} disabled={busyId === o.id}>
                            {busyId === o.id ? 'Accepting…' : 'Accept'}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile: cards */}
              <div className="md:hidden space-y-3">
                {filteredJobs.map((o) => (
                  <Card key={o.id}>
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-body font-semibold text-ink">{o.item}</p>
                        <p className="font-body text-xs text-ink-soft mt-0.5">{o.pickup} → {o.dropoff}</p>
                        <p className="font-body text-xs text-ink-soft">{ZONE_LABEL[o.pickupZone]} → {ZONE_LABEL[o.dropoffZone]}</p>
                      </div>
                      <span className="font-mono text-sm text-route font-semibold shrink-0">{o.riderPayout} RWF</span>
                    </div>
                    <Button variant="secondary" onClick={() => acceptJob(o.id)} disabled={busyId === o.id}>
                      {busyId === o.id ? 'Accepting…' : 'Accept job'}
                    </Button>
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
