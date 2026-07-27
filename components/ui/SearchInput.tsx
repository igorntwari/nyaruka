'use client';

import React from 'react';
import { Search } from 'lucide-react';

interface SearchInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'className'> {
  className?: string;
}

export default function SearchInput({ className = '', ...props }: SearchInputProps) {
  return (
    <div className="relative w-full">
      <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-soft pointer-events-none" />
      <input
        type="text"
        className={`w-full min-h-[44px] rounded-2xl border border-ink/10 pl-11 pr-4 font-body text-[15px] text-ink bg-white outline-none transition-colors focus:border-route ${className}`}
        {...props}
      />
    </div>
  );
}
