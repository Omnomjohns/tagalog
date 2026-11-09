import Dexie, { type Table } from 'dexie';
import type { Override } from '../content/types';
import type { DayRow } from '../progress/streak';
import type { StoredCard } from '../srs/fsrs';
import type { SkillRow } from '../srs/mastery';

/** Version of the stored data format. Bump together with a Dexie upgrade and a backup migration. */
export const SCHEMA_VERSION = 1;

export interface CardRow { id: string; kind: 'item' | 'prompt'; card: StoredCard; }
export interface ReviewRow { id?: number; refId: string; ts: number; day: string; rating: number; isNew: boolean; rubric?: number[]; }
export interface RetellRound { limitSec: number; durationSec: number; words?: number; }
export interface RetellRow { id?: number; promptId: string; ts: number; day: string; rounds: RetellRound[]; }
export type RecordingKind = 'practice' | 'retell' | 'reference';
export interface RecordingRow {
  id?: number; refId: string; kind: RecordingKind; ts: number; durationSec: number;
  mimeType: string; data: ArrayBuffer; starred: boolean;
}
export interface KVRow { key: string; value: unknown; }

export interface Settings {
  sessionMinutes: 5 | 10 | 15;
  newPerDay: number;
  maxReviews: number;
  retention: number;
  theme: 'auto' | 'light' | 'dark';
  cueLang: 'en' | 'de' | 'both';
  retellSeconds: [number, number, number];
  sound: boolean;
}
export const DEFAULT_SETTINGS: Settings = {
  sessionMinutes: 10, newPerDay: 10, maxReviews: 60, retention: 0.9, theme: 'auto', cueLang: 'en',
  retellSeconds: [90, 60, 45], sound: true,
};

export class SalitaDB extends Dexie {
  cards!: Table<CardRow, string>;
  reviews!: Table<ReviewRow, number>;
  skills!: Table<SkillRow, string>;
  days!: Table<DayRow, string>;
  retells!: Table<RetellRow, number>;
  recordings!: Table<RecordingRow, number>;
  overrides!: Table<Override, string>;
  kv!: Table<KVRow, string>;

  constructor(name = 'salita') {
    super(name);
    this.version(SCHEMA_VERSION).stores({
      cards: 'id',
      reviews: '++id, day, refId',
      skills: 'skill',
      days: 'day',
      retells: '++id, ts',
      recordings: '++id, refId, kind, ts',
      overrides: 'id',
      kv: 'key',
    });
  }

  async get<T>(key: string, fallback: T): Promise<T> {
    const row = await this.kv.get(key);
    return row ? (row.value as T) : fallback;
  }
  set(key: string, value: unknown): Promise<string> {
    return this.kv.put({ key, value });
  }
  async settings(): Promise<Settings> {
    return { ...DEFAULT_SETTINGS, ...(await this.get<Partial<Settings>>('settings', {})) };
  }
}

export const db = new SalitaDB();
