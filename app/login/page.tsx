'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { useStore, ApiError } from '@/lib/store';
import { Role } from '@/lib/types';

const ROLE_HOME: Record<Role, string> = {
  CUSTOMER: '/home',
  RIDER: '/rider',
  BUSINESS: '/business',
  ADMIN: '/admin',
};

export default function LoginPage() {
  const router = useRouter();
  const { login } = useStore();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ [k: string]: string }>({});
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const next: { [k: string]: string } = {};
    if (!/^0\d{9}$/.test(phone.replace(/\s/g, ''))) next.phone = 'Enter a valid phone number, e.g. 0788123456.';
    if (password.length < 1) next.password = 'Enter your password.';
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSubmitting(true);
    try {
      const user = await login(phone.trim(), password);
      router.push(ROLE_HOME[user.role]);
    } catch (err) {
      setErrors({ form: err instanceof ApiError ? err.message : 'Could not log in. Try again.' });
      setSubmitting(false);
    }
  }

  return (
    <main className="screen px-6 pt-12 pb-10">
      <p className="font-display font-bold text-2xl text-ink mb-1">Welcome back</p>
      <p className="font-body text-ink-soft text-sm mb-8">Log in to place or track an order.</p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <Input label="Phone number" placeholder="0788 123 456" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} error={errors.phone} />
        <Input label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} error={errors.password} />
        {errors.form && <p className="text-sm text-danger font-body">{errors.form}</p>}
        <Button type="submit" className="mt-2" disabled={submitting}>{submitting ? 'Logging in…' : 'Log in'}</Button>
      </form>

      <p className="text-center font-body text-sm text-ink-soft mt-6">
        New to Nyaruka?{' '}
        <Link href="/register" className="text-route font-semibold">Create an account</Link>
      </p>
    </main>
  );
}
