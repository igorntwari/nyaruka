'use client';

import { useRouter } from 'next/navigation';
import { Briefcase } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import BusinessNav from '@/components/ui/BusinessNav';
import { useStore } from '@/lib/store';
import { useRequireRole } from '@/lib/useRequireRole';

export default function BusinessAccountPage() {
  const router = useRouter();
  const { user } = useRequireRole('BUSINESS');
  const { logout, orders } = useStore();

  if (!user) return null;

  return (
    <main className="dash-shell px-6 pt-10 pb-28 lg:px-10">
      <p className="font-display font-bold text-2xl text-ink mb-8">Account</p>

      <Card className="flex items-center gap-4 mb-6">
        <span className="h-14 w-14 rounded-full bg-route-mint flex items-center justify-center shrink-0">
          <Briefcase size={24} className="text-route-deep" />
        </span>
        <div>
          <p className="font-body font-semibold text-ink">{user.businessProfile?.businessName ?? user.name}</p>
          <p className="font-mono text-sm text-ink-soft">{user.phone}</p>
        </div>
      </Card>

      <Card className="mb-6">
        <div className="flex justify-between font-body text-sm py-1">
          <span className="text-ink-soft">Contact name</span>
          <span className="text-ink font-semibold">{user.name}</span>
        </div>
        <div className="flex justify-between font-body text-sm py-1">
          <span className="text-ink-soft">Address</span>
          <span className="text-ink font-semibold">{user.businessProfile?.address ?? '—'}</span>
        </div>
        <div className="flex justify-between font-body text-sm py-1">
          <span className="text-ink-soft">Total requests</span>
          <span className="text-ink font-semibold">{orders.length}</span>
        </div>
      </Card>

      <Button
        variant="ghost"
        onClick={() => {
          logout();
          router.replace('/');
        }}
      >
        Log out
      </Button>

      <BusinessNav />
    </main>
  );
}
