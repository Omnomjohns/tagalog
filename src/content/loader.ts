import raw from './content.gen.json';
import type { Content, Item, Override, Skill, SpeakingPrompt, Unit } from './types';

export const baseContent = raw as unknown as Content;

/** Applies Review Queue edits (status and text) on top of the bundled content. */
export function applyOverrides(content: Content, overrides: Override[]): Content {
  if (!overrides.length) return content;
  const byId = new Map(overrides.map((o) => [o.id, o]));
  return {
    ...content,
    items: content.items.map((it) => {
      const o = byId.get(it.id);
      if (!o) return it;
      return {
        ...it,
        review: o.review ?? it.review,
        cueEn: o.cueEn ?? it.cueEn,
        gloss: o.gloss ?? it.gloss,
        answers: it.answers.map((a, i) => ({ ...a, tl: o.answers?.[i] ?? a.tl })),
      };
    }),
    prompts: content.prompts.map((p) => {
      const o = byId.get(p.id);
      if (!o) return p;
      return {
        ...p,
        review: o.review ?? p.review,
        promptEn: o.cueEn ?? p.promptEn,
        modelAnswer: { ...p.modelAnswer, tl: o.answers?.[0] ?? p.modelAnswer.tl },
      };
    }),
  };
}

/** Rejected rows, drafts and unreviewed low-confidence rows are never scheduled. */
export function isSchedulable(row: Item | SpeakingPrompt, unit: Unit | undefined): boolean {
  if (!unit || unit.status === 'draft' || unit.status === 'rejected') return false;
  if (row.review === 'approved') return true;
  if (row.review !== 'needs_review') return false;
  return !('confidence' in row) || row.confidence !== 'low';
}

export const FILIPINO_ONLY: Skill = 'vocab_filipino_only';

const ROWS: [Skill, string][] = [
  ['word_order', 'Verb first / natural word order'],
  ['focus_actor', 'Correct focus (affix matches the ang-phrase)'],
  ['focus_object', 'Correct focus (affix matches the ang-phrase)'],
  ['focus_locative', 'Correct focus (affix matches the ang-phrase)'],
  ['focus_benefactive', 'Correct focus (affix matches the ang-phrase)'],
  ['focus_instrumental', 'Correct focus (affix matches the ang-phrase)'],
  ['aspect', 'Correct aspect'],
  ['markers', 'Markers ang/ng/sa, si/ni/kay'],
  ['linker', 'Linker na / -ng'],
  ['enclitics', 'Enclitic order (na, pa, po, ba, rin…)'],
  ['politeness', 'Politeness (po/opo, kayo/ninyo)'],
  ['pseudo_verbs', 'Pseudo-verb pattern (gusto kong…)'],
  ['existentials', 'May / mayroon / wala pattern'],
  ['connectors', 'Connectors and frames'],
  ['conditionals', 'Conditional / hypothetical form'],
  ['causatives', 'Causative form'],
  ['abilitative', 'Ability / accidental form'],
];

/** Checklist rows for an item: one per tagged skill, plus the Filipino-only row. */
export function checklistRows(skills: Skill[]): { skill: Skill; label: string }[] {
  const rows = ROWS.filter(([s]) => skills.includes(s)).map(([skill, label]) => ({ skill, label }));
  return [...rows, { skill: FILIPINO_ONLY, label: 'No English filler needed' }];
}

const NAMES: Record<string, string> = {
  word_order: 'Word order', focus_actor: 'Actor focus', focus_object: 'Object focus',
  focus_locative: 'Locative focus', focus_benefactive: 'Benefactive focus',
  focus_instrumental: 'Instrumental focus', aspect: 'Aspect', markers: 'Markers', linker: 'Linker',
  enclitics: 'Enclitics', pseudo_verbs: 'Pseudo-verbs', existentials: 'May / wala',
  politeness: 'Politeness', connectors: 'Connectors', conditionals: 'Conditionals',
  causatives: 'Causatives', abilitative: 'Abilitative', vocab_filipino_only: 'Filipino only',
};
export const skillName = (s: string): string => NAMES[s] ?? s.replace(/^vocab_/, '').replace(/_/g, ' ');
