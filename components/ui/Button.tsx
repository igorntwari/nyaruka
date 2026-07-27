'use client';

import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
}

export default function Button({ variant = 'primary', className = '', children, ...props }: ButtonProps) {
  const base =
  'w-full min-h-[48px] rounded-full font-body font-semibold text-[15px] transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-route';
  const variants: Record<string, string> = {
  primary: 'bg-route text-paper hover:bg-route-deep active:bg-route-deep',
  secondary: 'bg-route-mint text-route-deep hover:bg-route/10',
  ghost: 'bg-transparent text-ink underline underline-offset-4 decoration-ink/30',
  };
  return (
  <button className={`${base} ${variants[variant]} ${className}`} {...props}>
  {children}
  </button>
  );
}
