'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Smartphone } from 'lucide-react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { useStore, ApiError } from '@/lib/store';

export default function PayPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { getOrder, payOrder, user } = useStore();
  const order = getOrder(params.id);
  const [status, setStatus] = useState<'idle' | 'pending' | 'failed'>('idle');
  const [error, setError] = useState('');

  if (!order) {
  return <main className="screen px-6 pt-10"><p className="font-body text-ink-soft">Order not found.</p></main>;
  }

  async function handlePay() {
  setStatus('pending');
  setError('');
  try {
  const { ok } = await payOrder(order!.id, user?.phone);
  if (!ok) {
    setStatus('failed');
    return;
  }
  router.push(`/order/${order!.id}/track`);
  } catch (err) {
  setStatus('failed');
  setError(err instanceof ApiError ? err.message : 'Could not reach the payment service.');
  }
  }

  return (
  <main className="screen px-6 pt-10 pb-10">
  <p className="font-display font-bold text-2xl text-ink mb-1">Confirm payment</p>
  <p className="font-body text-ink-soft text-sm mb-8">Pay with MTN Mobile Money to send your rider.</p>

  <Card className="mb-6">
    <div className="flex justify-between font-body text-sm text-ink-soft mb-2">
    <span>Item</span><span className="text-ink">{order.item}</span>
    </div>
    <div className="flex justify-between font-body text-sm text-ink-soft mb-2">
    <span>Route</span><span className="text-ink text-right max-w-[60%]">{order.pickup} → {order.dropoff}</span>
    </div>
    <div className="h-px bg-ink/10 my-3" />
    <div className="flex justify-between items-center">
    <span className="font-body font-semibold text-ink">Delivery fee</span>
    <span className="font-mono text-lg font-semibold text-route">{order.cost} RWF</span>
    </div>
  </Card>

  <Card className="mb-6 flex items-center gap-3">
    <span className="h-10 w-10 rounded-full bg-amber-soft flex items-center justify-center shrink-0">
    <Smartphone size={18} className="text-amber" />
    </span>
    <div>
    <p className="font-body text-xs text-ink-soft">MTN Mobile Money number</p>
    <p className="font-mono text-ink font-semibold">{user?.phone ?? '0788 000 000'}</p>
    </div>
  </Card>

  {status === 'failed' && (
    <p className="text-danger font-body text-sm mb-4">
    {error || 'Payment did not go through. Nothing was charged please try again or call the hotline.'}
    </p>
  )}

  <Button onClick={handlePay} disabled={status === 'pending'}>
    {status === 'pending' ? 'Confirming with MTN…' : `Pay ${order.cost} RWF`}
  </Button>
  </main>
  );
}
