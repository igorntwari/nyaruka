import React from 'react';
import { OrderStatus, STATUS_ORDER } from '@/lib/types';

export default function RouteMini({ status }: { status: OrderStatus }) {
  const currentIdx = STATUS_ORDER.indexOf(status);
  return (
  <div className="flex items-center gap-1 w-full">
  {STATUS_ORDER.map((s, i) => (
    <React.Fragment key={s}>
    <span
    className={`h-2 w-2 rounded-full shrink-0 ${i <= currentIdx ? 'bg-route' : 'bg-ink/15'}`}
    />
    {i < STATUS_ORDER.length - 1 && (
    <span
      className={`h-[2px] flex-1 ${i < currentIdx ? 'bg-route' : 'bg-ink/15'}`}
      style={i >= currentIdx ? { backgroundImage: 'repeating-linear-gradient(90deg, currentColor 0 4px, transparent 4px 8px)', backgroundColor: 'transparent', color: 'rgb(22 36 29 / 0.15)' } : {}}
    />
    )}
    </React.Fragment>
  ))}
  </div>
  );
}
