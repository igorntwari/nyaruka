'use client';

import React from 'react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
  hideLabel?: boolean;
}

export default function Select({ label, error, id, className = '', options, placeholder, hideLabel = false, ...props }: SelectProps) {
  const selectId = id || label.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="w-full">
      <label htmlFor={selectId} className={hideLabel ? 'sr-only' : 'block font-body text-sm font-medium text-ink-soft mb-1.5'}>
        {label}
      </label>
      <select
        id={selectId}
        className={`w-full min-h-[44px] rounded-2xl border px-4 font-body text-[15px] text-ink bg-white outline-none transition-colors appearance-none
        ${error ? 'border-danger focus:border-danger' : 'border-ink/10 focus:border-route'}
        ${className}`}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {error && <p className="mt-1.5 text-sm text-danger font-body">{error}</p>}
    </div>
  );
}
