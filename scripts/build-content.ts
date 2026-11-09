// Validates /content/units/*.json with zod and bundles them into src/content/content.gen.json.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';

const root = join(import.meta.dirname, '..');
const review = z.enum(['draft', 'needs_review', 'approved', 'rejected']);
const confidence = z.enum(['high', 'medium', 'low']);
const source = z.enum(['authored', 'tatoeba', 'llm']);
const baseSkills = ['word_order', 'focus_actor', 'focus_object', 'focus_locative', 'focus_benefactive',
  'focus_instrumental', 'aspect', 'markers', 'linker', 'enclitics', 'pseudo_verbs', 'existentials',
  'politeness', 'connectors', 'conditionals', 'causatives', 'abilitative'];
const skill = z.string().refine((s) => baseSkills.includes(s) || /^vocab_[a-z_]+$/.test(s), 'unknown skill');
const text = z.string().trim().min(1);

const unit = z.strictObject({ id: text, order: z.number().int(), title: text, titleEn: text,
  goals: z.array(text).min(1), skills: z.array(skill).min(1), status: review });
const chunk = z.strictObject({ id: text, unitId: text, tl: text, en: text, de: text.optional(),
  notes: text.optional(), skills: z.array(skill), audio: text.optional(), review, confidence, source,
  sourceRef: text.optional() });
const pattern = z.strictObject({ id: text, unitId: text, name: text, explanationEn: text, formula: text,
  examples: z.array(z.strictObject({ tl: text, en: text })).min(1), skills: z.array(skill) });
const item = z.strictObject({ id: text, unitId: text,
  type: z.enum(['produce', 'transform', 'chunkbuild', 'shadow', 'recognize']),
  cueEn: text, cueDe: text.optional(), instruction: text.optional(), sourceTl: text.optional(),
  answers: z.array(z.strictObject({ tl: text, register: z.enum(['neutral', 'polite', 'casual']),
    audio: text.optional() })).min(1),
  requiredChunks: z.array(text).optional(), skills: z.array(skill).min(1),
  difficulty: z.number().int().min(1).max(5), gloss: text.optional(), review, confidence, source,
  sourceRef: text.optional() });
const prompt = z.strictObject({ id: text, unitId: text,
  kind: z.enum(['situation', 'opinion', 'story', 'retell432', 'narrate']), promptEn: text,
  promptTl: text.optional(), requiredChunks: z.array(text),
  modelAnswer: z.strictObject({ tl: text, audio: text.optional() }),
  targetSeconds: z.number().int().positive(), skills: z.array(skill).min(1), review });
const unitFile = z.strictObject({ unit, chunks: z.array(chunk), patterns: z.array(pattern),
  items: z.array(item), prompts: z.array(prompt) });

const dir = join(root, 'content/units');
const out = { units: [], chunks: [], patterns: [], items: [], prompts: [] } as Record<string, unknown[]>;
const ids = new Set<string>();
const errors: string[] = [];

for (const file of readdirSync(dir).filter((f) => f.endsWith('.json')).sort()) {
  const parsed = unitFile.safeParse(JSON.parse(readFileSync(join(dir, file), 'utf8')));
  if (!parsed.success) {
    for (const issue of parsed.error.issues) errors.push(`${file}: ${issue.path.join('.')}: ${issue.message}`);
    continue;
  }
  const u = parsed.data;
  for (const row of [u.unit, ...u.chunks, ...u.patterns, ...u.items, ...u.prompts]) {
    if (ids.has(row.id)) errors.push(`${file}: duplicate id ${row.id}`);
    ids.add(row.id);
    if ('unitId' in row && row.unitId !== u.unit.id) errors.push(`${file}: ${row.id} has wrong unitId`);
  }
  for (const it of u.items) {
    if (it.type === 'transform' && (!it.sourceTl || !it.instruction)) errors.push(`${file}: ${it.id} transform needs sourceTl and instruction`);
    if (it.type === 'chunkbuild' && !it.requiredChunks?.length) errors.push(`${file}: ${it.id} chunkbuild needs requiredChunks`);
  }
  out.units!.push(u.unit); out.chunks!.push(...u.chunks); out.patterns!.push(...u.patterns);
  out.items!.push(...u.items); out.prompts!.push(...u.prompts);
}

if (errors.length) {
  console.error(`Content validation failed:\n  ${errors.join('\n  ')}`);
  process.exit(1);
}
writeFileSync(join(root, 'src/content/content.gen.json'), JSON.stringify(out));
console.log(`content: ${out.units!.length} units, ${out.items!.length} items, ${out.prompts!.length} prompts, ${out.chunks!.length} chunks`);
