import type { Step } from '../srs/sessionBuilder';

/** In-memory navigation. No router and no URL hash: hash changes can revoke mic permission on iOS. */
export type Screen =
  | { name: 'today' }
  | { name: 'session'; steps: Step[] }
  | { name: 'units' }
  | { name: 'unit'; unitId: string }
  | { name: 'progress' }
  | { name: 'review' }
  | { name: 'settings' }
  | { name: 'about' };

export type Go = (screen: Screen) => void;
export const TABS = ['today', 'units', 'progress', 'settings'] as const;
export type Tab = (typeof TABS)[number];

/** Which tab is highlighted for a given screen. */
export const tabOf = (s: Screen): Tab =>
  s.name === 'unit' || s.name === 'review' ? 'units' : s.name === 'about' ? 'settings' : s.name === 'session' ? 'today' : s.name;
