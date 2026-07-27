import Link from 'next/link';
import Button from '@/components/ui/Button';

export default function SplashPage() {
  return (
  <main className="screen flex flex-col justify-between px-6 pt-16 pb-10">
  <div>
    <p className="font-display font-extrabold text-4xl text-route">Nyaruka</p>
    <p className="font-body text-ink-soft mt-1 text-[15px]">Vuba, vuba, ku giciro gito.</p>
    <p className="font-body text-ink-soft text-sm">Fast delivery, at a price that makes sense.</p>
  </div>

  <div className="my-10">
    <svg viewBox="0 0 320 160" className="w-full h-auto" aria-hidden="true">
    <circle cx="30" cy="120" r="8" fill="#0F6B4C" />
    <line x1="38" y1="118" x2="270" y2="46" stroke="#0F6B4C" strokeWidth="2" strokeDasharray="1 10" strokeLinecap="round" />
    <circle cx="278" cy="42" r="9" fill="#C98A1F" />
    <circle cx="150" cy="82" r="14" fill="#E7F4EC" stroke="#0F6B4C" strokeWidth="2" />
    <path d="M144 86 l4 -8 l6 0 l4 8 M148 78 l0 -4" stroke="#0F6B4C" strokeWidth="1.6" fill="none" strokeLinecap="round" />
    </svg>
  </div>

  <div className="space-y-3">
    <Link href="/register">
    <Button variant="primary" className="mb-5">
      Create account
    </Button>
    </Link>
    <Link href="/login">
    <Button variant="secondary" className=" border border-red-400!">
      Log in
    </Button>
    </Link>
  </div>
  </main>
  );
}
