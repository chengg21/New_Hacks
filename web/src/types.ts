// src/types.ts
export type QuizType = "mcq" | "true_false" | "short_answer";

export interface QuizQuestion {
  id: string;
  type: QuizType;
  prompt: string;
  choices?: string[];                       // MCQ only
  answer: number | boolean | string[];      // MCQ index | TF | SA acceptable strings
  explanation?: string;
  difficulty?: "easy" | "medium" | "hard";
}

export interface QuizPayload {
  meta: {
    question_count: number;
    types: QuizType[];
    source_summary: string;
  };
  questions: QuizQuestion[];
}
