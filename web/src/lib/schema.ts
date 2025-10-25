// src/lib/schema.ts
export const QuizJSONSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    meta: {
      type: "object",
      additionalProperties: false,
      properties: {
        question_count: { type: "integer", minimum: 1, maximum: 100 },
        types: {
          type: "array",
          minItems: 1,
          items: { enum: ["mcq", "true_false", "short_answer"] }
        },
        source_summary: { type: "string" }
      },
      required: ["question_count", "types", "source_summary"]
    },
    questions: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          id: { type: "string" },
          type: { enum: ["mcq", "true_false", "short_answer"] },
          prompt: { type: "string" },
          choices: { type: "array", items: { type: "string" } },
          // MCQ: correct index; T/F: boolean; SA: acceptable strings/keywords
          answer: {
            anyOf: [
              { type: "integer", minimum: 0 },
              { type: "boolean" },
              { type: "array", items: { type: "string" }, minItems: 1 }
            ]
          },
          explanation: { type: "string" },
          difficulty: { enum: ["easy", "medium", "hard"] }
        },
        required: ["id", "type", "prompt", "answer"]
      }
    }
  },
  required: ["meta", "questions"]
} as const;
