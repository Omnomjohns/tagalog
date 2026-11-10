import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { KEEP_PER_ITEM, modelAudio, pruneRecordings, referenceIds } from '../app/store';
import { db, type RecordingKind } from './dexie';

const DAY = 86_400_000;
const add = (refId: string, kind: RecordingKind, ageDays: number, starred = false) =>
  db.recordings.add({ refId, kind, ts: Date.now() - ageDays * DAY, durationSec: 5, mimeType: 'audio/mp4', data: new ArrayBuffer(4), starred });

beforeEach(async () => { await db.recordings.clear(); });

describe('recording retention', () => {
  it('keeps the latest 3 practice takes per item, recent retells, starred and reference audio', async () => {
    for (let i = 0; i < 6; i++) await add('a', 'practice', i);
    const starred = await add('a', 'practice', 50, true);
    await add('b', 'practice', 90);
    const oldRetell = await add('p', 'retell', 31);
    await add('p', 'retell', 29);
    await add('a', 'reference', 400);

    expect(await pruneRecordings()).toBe(4); // 3 old takes of "a" + the old retell
    const left = await db.recordings.toArray();
    expect(left.filter((r) => r.refId === 'a' && r.kind === 'practice' && !r.starred).length).toBe(KEEP_PER_ITEM);
    expect(left.filter((r) => r.refId === 'a' && !r.starred && r.kind === 'practice').every((r) => r.ts > Date.now() - 3 * DAY)).toBe(true);
    expect(left.some((r) => r.id === starred)).toBe(true);
    expect(left.some((r) => r.id === oldRetell)).toBe(false);
    expect(left.filter((r) => r.kind === 'reference').length).toBe(1);
    expect(left.filter((r) => r.refId === 'b').length).toBe(1);
  });

  it('cleans down to one take per item on request', async () => {
    for (let i = 0; i < 3; i++) await add('a', 'practice', i);
    await pruneRecordings(true);
    expect(await db.recordings.count()).toBe(1);
  });

  it('finds reference audio by item id and prefers it over bundled audio', async () => {
    await add('a', 'reference', 1);
    await add('b', 'practice', 1);
    expect(await referenceIds()).toEqual(new Set(['a']));
    expect(await modelAudio('a', 'audio/a.mp3')).toBeInstanceOf(Blob);
    expect(await modelAudio('b')).toBeUndefined();
    expect(await modelAudio('b', 'audio/b.mp3')).toMatch(/audio\/b\.mp3$/);
  });
});
