'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LucideIcon } from 'lucide-react';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  active?: boolean;
}

export default function DashNav({ items, brand }: { items: NavItem[]; brand: string }) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile & tablet: bottom tab bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-ink/10 flex justify-around items-center h-16 z-20">
        {items.map(({ href, label, icon: Icon, active }) => {
          const isActive = active ?? pathname === href;
          return (
            <Link key={label} href={href} className="flex flex-col items-center justify-center gap-1 flex-1 h-full font-body">
              <Icon size={22} strokeWidth={2} className={isActive ? 'text-route' : 'text-ink-soft'} />
              <span className={`text-[11px] ${isActive ? 'text-route font-semibold' : 'text-ink-soft'}`}>{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Desktop: left sidebar */}
      <nav className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 lg:w-64 bg-white border-r border-ink/10 px-4 py-6 z-20">
        <p className="font-display font-bold text-xl text-route px-2 mb-8">{brand}</p>
        <div className="flex flex-col gap-1">
          {items.map(({ href, label, icon: Icon, active }) => {
            const isActive = active ?? pathname === href;
            return (
              <Link
                key={label}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-body text-sm transition-colors ${
                  isActive ? 'bg-route-mint text-route-deep font-semibold' : 'text-ink-soft hover:bg-paper'
                }`}
              >
                <Icon size={18} strokeWidth={2} />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
