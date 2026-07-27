'use client';

import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export default function Input({ label, error, id, className = '', ...props }: InputProps) {
  const inputId = id || label.toLowerCase().replace(/\s+/g, '-');
  return (
  <div className="w-full">
  <label htmlFor={inputId} className="block font-body text-sm font-medium text-ink-soft mb-1.5">
    {label}
  </label>
  <input
    id={inputId}
    className={`w-full min-h-[48px] rounded-2xl border px-4 font-body text-[15px] text-ink bg-white outline-none transition-colors
    ${error ? 'border-danger focus:border-danger' : 'border-ink/10 focus:border-route'}
    ${className}`}
    {...props}
  />
  {error && <p className="mt-1.5 text-sm text-danger font-body">{error}</p>}
  </div>
  );
}
