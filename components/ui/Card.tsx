import React from 'react';

export default function Card({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return (
  <div className={`rounded-card bg-white shadow-soft p-5 ${className}`}>{children}</div>
  );
}
