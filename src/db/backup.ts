// Export / import of all progress as JSON. Recordings are not included (audio stays on the device).
import type { Override } from '../content/types';
import type { DayRow } from '../progress/streak';
import type { SkillRow } from '../srs/mastery';
import { SCHEMA_VERSION, type CardRow, type KVRow, type RetellRow, type ReviewRow, type SalitaDB } from './dexie';

export interface Backup {
  app: 'salita';
  schemaVersion: number;
  exportedAt: string;
  data: {
    cards: CardRow[]; reviews: ReviewRow[]; skills: SkillRow[]; days: DayRow[];
    retells: RetellRow[]; overrides: Override[]; kv: KVRow[];
  };
}
const TABLES = ['cards', 'reviews', 'skills', 'days', 'retells', 'overrides', 'kv'] as const;

export async function exportData(db: SalitaDB, now = new Date()): Promise<Backup> {
  const [cards, reviews, skills, days, retells, overrides, kv] = await Promise.all([
    db.cards.toArray(), db.reviews.toArray(), db.skills.toArray(), db.days.toArray(),
    db.retells.toArray(), db.overrides.toArray(), db.kv.toArray(),
  ]);
  return { app: 'salita', schemaVersion: SCHEMA_VERSION, exportedAt: now.toISOString(),
    data: { cards, reviews, skills, days, retells, overrides, kv } };
}

/** Upgrades older backups step by step. There is only version 1 so far. */
function migrate(backup: Backup): Backup {
  return backup;
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const KEYS: Record<(typeof TABLES)[number], string> = {
  cards: 'id', reviews: 'refId', skills: 'skill', days: 'day', retells: 'promptId', overrides: 'id', kv: 'key',
};

export function validateBackup(input: unknown): { ok: true; backup: Backup } | { ok: false; error: string } {
  if (!isObj(input) || input.app !== 'salita') return { ok: false, error: 'This is not a Salita backup file.' };
  if (typeof input.schemaVersion !== 'number' || input.schemaVersion < 1) return { ok: false, error: 'The backup has no valid schema version.' };
  if (input.schemaVersion > SCHEMA_VERSION) return { ok: false, error: 'This backup comes from a newer version of Salita. Update the app first.' };
  if (!isObj(input.data)) return { ok: false, error: 'The backup contains no data.' };
  for (const t of TABLES) {
    const rows = input.data[t];
    if (!Array.isArray(rows)) return { ok: false, error: `The backup is missing "${t}".` };
    if (!rows.every((r) => isObj(r) && typeof r[KEYS[t]] === 'string')) return { ok: false, error: `"${t}" contains invalid rows.` };
  }
  const cards = input.data.cards as Record<string, unknown>[];
  if (!cards.every((c) => isObj(c.card) && typeof c.card.due === 'string' && !Number.isNaN(Date.parse(c.card.due)))) {
    return { ok: false, error: 'Some cards have an invalid due date.' };
  }
  return { ok: true, backup: migrate(input as unknown as Backup) };
}

export const describeBackup = (b: Backup): string =>
  `Backup from ${b.exportedAt.slice(0, 10)}: ${b.data.cards.length} cards, ${b.data.reviews.length} reviews, ` +
  `${b.data.days.length} practice days, ${b.data.overrides.length} content edits.`;

/** Replaces all progress with the backup. Recordings on this device are left untouched. */
export async function importData(db: SalitaDB, backup: Backup): Promise<void> {
  const d = backup.data;
  await db.transaction('rw', [db.cards, db.reviews, db.skills, db.days, db.retells, db.overrides, db.kv], async () => {
    await Promise.all(TABLES.map((t) => db[t].clear()));
    await db.cards.bulkPut(d.cards);
    await db.reviews.bulkPut(d.reviews);
    await db.skills.bulkPut(d.skills);
    await db.days.bulkPut(d.days);
    await db.retells.bulkPut(d.retells);
    await db.overrides.bulkPut(d.overrides);
    await db.kv.bulkPut(d.kv);
  });
}
