export type Register = 'neutral' | 'polite' | 'casual';
export type ReviewStatus = 'draft' | 'needs_review' | 'approved' | 'rejected';
export type Confidence = 'high' | 'medium' | 'low';
export type Source = 'authored' | 'tatoeba' | 'llm';
export type Skill =
  | 'word_order' | 'focus_actor' | 'focus_object' | 'focus_locative' | 'focus_benefactive'
  | 'focus_instrumental' | 'aspect' | 'markers' | 'linker' | 'enclitics' | 'pseudo_verbs'
  | 'existentials' | 'politeness' | 'connectors' | 'conditionals' | 'causatives' | 'abilitative'
  | `vocab_${string}`;

export interface Unit { id: string; order: number; title: string; titleEn: string; goals: string[]; skills: Skill[]; status: ReviewStatus; }
export interface Chunk { id: string; unitId: string; tl: string; en: string; de?: string; notes?: string; skills: Skill[]; audio?: string; review: ReviewStatus; confidence: Confidence; source: Source; sourceRef?: string; }
export interface Pattern { id: string; unitId: string; name: string; explanationEn: string; formula: string; examples: { tl: string; en: string }[]; skills: Skill[]; }
export type ItemType = 'produce' | 'transform' | 'chunkbuild' | 'shadow' | 'recognize';
export interface Answer { tl: string; register: Register; audio?: string; }
export interface Item {
  id: string; unitId: string; type: ItemType;
  cueEn: string; cueDe?: string; instruction?: string; sourceTl?: string;
  answers: Answer[];
  requiredChunks?: string[]; skills: Skill[]; difficulty: 1 | 2 | 3 | 4 | 5;
  gloss?: string;
  review: ReviewStatus; confidence: Confidence; source: Source; sourceRef?: string;
}
export type PromptKind = 'situation' | 'opinion' | 'story' | 'retell432' | 'narrate';
export interface SpeakingPrompt {
  id: string; unitId: string; kind: PromptKind; promptEn: string; promptTl?: string;
  requiredChunks: string[]; modelAnswer: { tl: string; audio?: string }; targetSeconds: number;
  skills: Skill[]; review: ReviewStatus;
}
export interface UnitFile { unit: Unit; chunks: Chunk[]; patterns: Pattern[]; items: Item[]; prompts: SpeakingPrompt[]; }
export interface Content { units: Unit[]; chunks: Chunk[]; patterns: Pattern[]; items: Item[]; prompts: SpeakingPrompt[]; }

/** Local edits made in the Review Queue, stored in IndexedDB and included in the export. */
export interface Override {
  id: string;
  review?: ReviewStatus;
  cueEn?: string;
  gloss?: string;
  answers?: string[]; // edited Tagalog text per answer index (or the model answer for prompts)
  ts: number;
}
