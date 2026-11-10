import type { Item, SpeakingPrompt } from '../content/types';

/** Hook for a possible future assessment module. Only the local self-assessment exists; no network code. */
export interface AssessmentProvider {
  id: string;
  available(): Promise<boolean>;
  assess(input: { audio?: Blob; transcript?: string; item: Item | SpeakingPrompt }): Promise<{
    feedback: string;
    suggestedRating?: 1 | 2 | 3 | 4;
    corrections?: string[];
  }>;
}

export const JUDGE_NOTE =
  'Salita cannot check your grammar automatically. You are the judge: compare with the model and be honest.';

export const LocalSelfAssessment: AssessmentProvider = {
  id: 'local-self',
  available: async () => true,
  assess: async () => ({ feedback: JUDGE_NOTE }),
};
