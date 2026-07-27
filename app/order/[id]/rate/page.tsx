'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Star } from 'lucide-react';
import Button from '@/components/ui/Button';
import { useStore, ApiError } from '@/lib/store';

export default function RatePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { getOrder, rateOrder } = useStore();
  const order = getOrder(params.id);
  const [stars, setStars] = useState(5);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!order) {
  return <main className="screen px-6 pt-10"><p className="font-body text-ink-soft">Order not found.</p></main>;
  }

  async function handleSubmit() {
  setSubmitting(true);
  setError('');
  try {
  await rateOrder(order!.id, stars, comment.trim());
  setSubmitted(true);
  setTimeout(() => router.push('/home'), 1200);
  } catch (err) {
  setError(err instanceof ApiError ? err.message : 'Could not submit this rating.');
  setSubmitting(false);
  }
  }

  if (submitted) {
  return (
  <main className="screen px-6 pt-24 text-center">
    <p className="font-display font-bold text-2xl text-route mb-2">Murakoze!</p>
    <p className="font-body text-ink-soft text-sm">Thanks for the feedback.</p>
  </main>
  );
  }

  return (
  <main className="screen px-6 pt-16 pb-10 flex flex-col items-center">
  <p className="font-display font-bold text-2xl text-ink mb-1 text-center">How was your delivery?</p>
  <p className="font-body text-ink-soft text-sm mb-8 text-center">{order.item} delivered by {order.rider?.name ?? 'your rider'}</p>

  <div className="flex gap-2 mb-8">
    {[1, 2, 3, 4, 5].map((n) => (
    <button key={n} onClick={() => setStars(n)} aria-label={`${n} stars`}>
    <Star size={36} className={n <= stars ? 'fill-amber text-amber' : 'text-ink/15'} />
    </button>
    ))}
  </div>

  <textarea
    value={comment}
    onChange={(e) => setComment(e.target.value)}
    placeholder="Anything you'd like to add? (optional)"
    rows={4}
    className="w-full rounded-2xl border border-ink/10 p-4 font-body text-[15px] text-ink outline-none focus:border-route mb-8"
  />

  {error && <p className="font-body text-sm text-danger mb-4 text-center">{error}</p>}
  <Button onClick={handleSubmit} disabled={submitting}>{submitting ? 'Submitting…' : 'Submit rating'}</Button>
  </main>
  );
}
