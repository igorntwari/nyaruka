import React from 'react';
import { OrderStatus, STATUS_LABEL, STATUS_ORDER } from '@/lib/types';

export default function RouteStepper({ status }: { status: OrderStatus }) {
  const currentIdx = STATUS_ORDER.indexOf(status);

  return (
  <div className="relative pl-2">
  {STATUS_ORDER.map((s, i) => {
    const done = i < currentIdx;
    const active = i === currentIdx;
    const isLast = i === STATUS_ORDER.length - 1;
    return (
    <div key={s} className="relative flex gap-4 pb-8 last:pb-0">
    {!isLast && (
      <div
      className={`absolute left-[9px] top-6 bottom-0 w-[2px] ${
      done ? 'bg-route' : 'border-l-2 border-dashed border-ink/15'
      }`}
      style={done ? {} : { background: 'none' }}
      />
    )}
    <div className="relative z-10 shrink-0">
      <div
      className={`h-5 w-5 rounded-full border-2 flex items-center justify-center
      ${done ? 'bg-route border-route' : active ? 'bg-paper border-route' : 'bg-paper border-ink/20'}
      ${active ? 'ring-4 ring-route/15' : ''}`}
      >
      {done && <span className="h-2 w-2 rounded-full bg-white" />}
      {active && <span className="h-2 w-2 rounded-full bg-route animate-pulse" />}
      </div>
    </div>
    <div className="pt-0.5">
      <p className={`font-body text-[15px] ${active ? 'font-semibold text-ink' : done ? 'text-ink' : 'text-ink-soft'}`}>
      {STATUS_LABEL[s]}
      </p>
      {active && <p className="text-sm text-route font-body mt-0.5">In progress</p>}
    </div>
    </div>
    );
  })}
  </div>
  );
}
