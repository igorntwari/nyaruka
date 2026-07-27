'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { useStore, ApiError } from '@/lib/store';
import { Role } from '@/lib/types';

const ROLE_HOME: Record<Role, string> = {
  CUSTOMER: '/home',
  RIDER: '/rider',
  BUSINESS: '/business',
  ADMIN: '/admin',
};

const ROLE_OPTIONS = [
  { value: 'CUSTOMER', label: 'Customer — send deliveries' },
  { value: 'RIDER', label: 'Rider — deliver on an e-bicycle' },
  { value: 'BUSINESS', label: 'Business — request deliveries for my shop' },
];

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useStore();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('CUSTOMER');
  const [businessName, setBusinessName] = useState('');
  const [errors, setErrors] = useState<{ [k: string]: string }>({});
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const next: { [k: string]: string } = {};
    if (name.trim().length < 2) next.name = 'Enter your full name.';
    if (!/^0\d{9}$/.test(phone.replace(/\s/g, ''))) next.phone = 'Enter a valid phone number, e.g. 0788123456.';
    if (password.length < 6) next.password = 'Password must be at least 6 characters.';
    if (role === 'BUSINESS' && !businessName.trim()) next.businessName = 'Enter your business name.';
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSubmitting(true);
    try {
      const user = await register(name.trim(), phone.trim(), password, {
        role,
        ...(role === 'BUSINESS' ? { businessName: businessName.trim() } : {}),
      });
      router.push(ROLE_HOME[user.role]);
    } catch (err) {
      setErrors({ form: err instanceof ApiError ? err.message : 'Could not create your account.' });
      setSubmitting(false);
    }
  }

  return (
    <main className="screen px-6 pt-12 pb-10">
      <p className="font-display font-bold text-2xl text-ink mb-1">Create your account</p>
      <p className="font-body text-ink-soft text-sm mb-8">It takes less than a minute.</p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <Select label="I am a…" options={ROLE_OPTIONS} value={role} onChange={(e) => setRole(e.target.value as Role)} />
        <Input label="Full name" placeholder="Uwimana Aline" value={name} onChange={(e) => setName(e.target.value)} error={errors.name} />
        <Input label="Phone number" placeholder="0788 123 456" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} error={errors.phone} />
        {role === 'BUSINESS' && (
          <Input label="Business name" placeholder="e.g. Paka Juice" value={businessName} onChange={(e) => setBusinessName(e.target.value)} error={errors.businessName} />
        )}
        <Input label="Password" type="password" placeholder="At least 6 characters" value={password} onChange={(e) => setPassword(e.target.value)} error={errors.password} />
        {errors.form && <p className="text-sm text-danger font-body">{errors.form}</p>}
        <Button type="submit" className="mt-2" disabled={submitting}>{submitting ? 'Creating account…' : 'Create account'}</Button>
      </form>

      <p className="text-center font-body text-sm text-ink-soft mt-6">
        Already have an account?{' '}
        <Link href="/login" className="text-route font-semibold">Log in</Link>
      </p>
    </main>
  );
}
