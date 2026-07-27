'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Phone, Star } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import RouteStepper from '@/components/ui/RouteStepper';
import RoleNav from '@/components/ui/RoleNav';
import { useStore, ApiError } from '@/lib/store';
import { ZONE_LABEL } from '@/lib/types';

export default function TrackPage() {
  const params = useParams<{ id: string }>();
  const { getOrder, refreshOrders, cancelOrder } = useStore();
  const order = getOrder(params.id);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState('');

  // Poll while the order is still moving — no push/websocket layer in this build,
  // so a short interval stands in for the rider's real status updates.
  useEffect(() => {
    if (!order || order.status === 'DELIVERED' || order.status === 'CANCELLED') return;
    const interval = setInterval(() => refreshOrders(), 3000);
    return () => clearInterval(interval);
  }, [order, refreshOrders]);

  if (!order) {
    return <main className="screen px-6 pt-10"><p className="font-body text-ink-soft">Order not found.</p></main>;
  }

  const paid = order.payment?.status === 'SUCCESS';

  if (!paid) {
    return (
      <main className="screen px-6 pt-10 pb-10">
        <p className="font-display font-bold text-2xl text-ink mb-2">Payment pending</p>
        <p className="font-body text-ink-soft text-sm mb-6">Finish payment to send this order to a rider.</p>
        <Link href={`/order/${order.id}/pay`}><Button>Go to payment</Button></Link>
      </main>
    );
  }

  async function handleCancel() {
    setCancelling(true);
    setError('');
    try {
      await cancelOrder(order!.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not cancel this order.');
    } finally {
      setCancelling(false);
    }
  }

  return (
    <main className="dash-shell px-6 pt-10 pb-28 lg:px-10">
      <p className="font-body text-xs text-ink-soft uppercase tracking-wide">{order.id.slice(0, 10).toUpperCase()}</p>
      <p className="font-display font-bold text-2xl text-ink mb-1">{order.item}</p>
      <p className="font-body text-ink-soft text-sm mb-8">
        {order.pickup} ({ZONE_LABEL[order.pickupZone]}) → {order.dropoff} ({ZONE_LABEL[order.dropoffZone]})
      </p>

      {order.status === 'CANCELLED' ? (
        <Card className="mb-6 border border-danger/20">
          <p className="font-body font-semibold text-danger">This order was cancelled.</p>
        </Card>
      ) : (
        <Card className="mb-6">
          <RouteStepper status={order.status} />
        </Card>
      )}

      {order.rider && (
        <Card className="mb-6 flex items-center justify-between">
          <div>
            <p className="font-body text-xs text-ink-soft">Your rider</p>
            <p className="font-body font-semibold text-ink">{order.rider.name}</p>
          </div>
          <a href={`tel:${order.rider.phone.replace(/\s/g, '')}`} className="h-11 w-11 rounded-full bg-route-mint flex items-center justify-center">
            <Phone size={18} className="text-route-deep" />
          </a>
        </Card>
      )}

      {order.status === 'PLACED' && !order.riderId && (
        <Card className="mb-6 border border-dashed border-ink/15">
          <p className="font-body text-xs text-ink-soft mb-3">
            Paid — waiting for a nearby rider to accept this delivery.
          </p>
          {error && <p className="font-body text-xs text-danger mb-3">{error}</p>}
          <Button variant="secondary" onClick={handleCancel} disabled={cancelling}>
            {cancelling ? 'Cancelling…' : 'Cancel this order'}
          </Button>
        </Card>
      )}

      {order.status === 'DELIVERED' && !order.rating && (
        <Link href={`/order/${order.id}/rate`}>
          <Button>Rate this delivery</Button>
        </Link>
      )}

      {order.status === 'DELIVERED' && order.rating && (
        <Card className="flex items-center gap-2">
          <Star size={16} className="fill-amber text-amber" />
          <p className="font-body text-sm text-ink">You rated this delivery {order.rating.stars}/5</p>
        </Card>
      )}

      <RoleNav />
    </main>
  );
}
