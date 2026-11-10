import type { ReactElement, ReactNode } from 'react';

export const fmtTime = (sec: number): string => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;

export function Sheet({ children, onClose, label }: { children: ReactNode; onClose: () => void; label: string }): ReactElement {
  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={label} onClick={(e) => e.stopPropagation()}>{children}</div>
    </div>
  );
}

export function Confirm({ title, body, yes, danger, onYes, onNo }: { title: string; body: string; yes: string; danger?: boolean; onYes: () => void; onNo: () => void }): ReactElement {
  return (
    <Sheet onClose={onNo} label={title}>
      <h2>{title}</h2>
      <p className="muted">{body}</p>
      <button className={`btn block ${danger ? 'danger' : 'primary'}`} onClick={onYes}>{yes}</button>
      <button className="btn block" onClick={onNo}>Cancel</button>
    </Sheet>
  );
}

export function Seg<T extends string | number>({ value, options, onChange, label }: { value: T; options: [T, string][]; onChange: (v: T) => void; label: string }): ReactElement {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map(([v, text]) => <button key={String(v)} aria-pressed={v === value} onClick={() => onChange(v)}>{text}</button>)}
    </div>
  );
}

export function Header({ title, onBack, right }: { title: string; onBack?: () => void; right?: ReactNode }): ReactElement {
  return (
    <div className="row between">
      <div className="row">
        {onBack && <button className="icon-btn" onClick={onBack} aria-label="Back">‹</button>}
        <h1>{title}</h1>
      </div>
      {right}
    </div>
  );
}

/** Countdown / progress ring drawn around its parent (used on the record button). */
export function Ring({ fraction, color = 'var(--amber)' }: { fraction: number; color?: string }): ReactElement {
  const r = 46;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true">
      <circle cx="50" cy="50" r={r} fill="none" stroke="var(--line)" strokeWidth="4" />
      <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - Math.max(0, Math.min(1, fraction)))} />
    </svg>
  );
}
