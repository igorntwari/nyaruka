'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { useStore, ApiError } from '@/lib/store';
import { ZONES, ZONE_LABEL, Zone } from '@/lib/types';

const ZONE_OPTIONS = ZONES.map((z) => ({ value: z, label: ZONE_LABEL[z] }));

export default function NewOrderPage() {
  const router = useRouter();
  const { placeOrder } = useStore();
  const [pickup, setPickup] = useState('');
  const [pickupZone, setPickupZone] = useState<Zone | ''>('');
  const [destination, setDestination] = useState('');
  const [dropoffZone, setDropoffZone] = useState<Zone | ''>('');
  const [item, setItem] = useState('');
  const [weight, setWeight] = useState('');
  const [errors, setErrors] = useState<{ [k: string]: string }>({});
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const next: { [k: string]: string } = {};
    if (!pickup.trim()) next.pickup = 'Where should the rider collect this from?';
    if (!pickupZone) next.pickupZone = 'Choose the pickup neighborhood.';
    if (!destination.trim()) next.destination = 'Where is this going?';
    if (!dropoffZone) next.dropoffZone = 'Choose the drop-off neighborhood.';
    if (!item.trim()) next.item = 'What are we delivering?';
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSubmitting(true);
    try {
      const order = await placeOrder(pickup.trim(), pickupZone as Zone, destination.trim(), dropoffZone as Zone, item.trim(), weight.trim() || '1');
      router.push(`/order/${order.id}/pay`);
    } catch (err) {
      setErrors({ form: err instanceof ApiError ? err.message : 'Could not place the order. Try again.' });
      setSubmitting(false);
    }
  }

  return (
    <main className="screen px-6 pt-10 pb-10">
      <p className="font-display font-bold text-2xl text-ink mb-1">New delivery</p>
      <p className="font-body text-ink-soft text-sm mb-8">A rider will collect and drop this off for you.</p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <Input label="Pickup location" placeholder="e.g. Paka Juice, Kimironko" value={pickup} onChange={(e) => setPickup(e.target.value)} error={errors.pickup} />
        <Select
          label="Pickup neighborhood"
          placeholder="Choose a zone"
          options={ZONE_OPTIONS}
          value={pickupZone}
          onChange={(e) => setPickupZone(e.target.value as Zone)}
          error={errors.pickupZone}
        />
        <Input label="Drop-off location" placeholder="e.g. Nyarutarama, house 12" value={destination} onChange={(e) => setDestination(e.target.value)} error={errors.destination} />
        <Select
          label="Drop-off neighborhood"
          placeholder="Choose a zone"
          options={ZONE_OPTIONS}
          value={dropoffZone}
          onChange={(e) => setDropoffZone(e.target.value as Zone)}
          error={errors.dropoffZone}
        />
        <Input label="What are we delivering?" placeholder="e.g. Chapati and juice" value={item} onChange={(e) => setItem(e.target.value)} error={errors.item} />
        <Input label="Estimated weight (kg)" placeholder="1" inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} />
        {errors.form && <p className="text-sm text-danger font-body">{errors.form}</p>}
        <Button type="submit" className="mt-2" disabled={submitting}>
          {submitting ? 'Placing order…' : 'Continue to payment'}
        </Button>
      </form>
    </main>
  );
}
