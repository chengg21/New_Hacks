// src/app/api/generate/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { extractTextFromFile, truncateForLLM } from "@/lib/extract";
import { QuizJSONSchema } from "@/lib/schema";

// Try to recover JSON even if the model adds prose/fences
function extractJson(text: string) {
  try { return JSON.parse(text); } catch {}
  const fenced = text.match(/```json([\s\S]*?)```/i)?.[1]
             ||  text.match(/```([\s\S]*?)```/)?.[1];
  if (fenced) { try { return JSON.parse(fenced); } catch {} }
  const first = text.indexOf("{");
  const last  = text.lastIndexOf("}");
  if (first >= 0 && last > first) {
    try { return JSON.parse(text.slice(first, last + 1)); } catch {}
  }
  return null;
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const files = form.getAll("files") as File[];
    const count = Number(form.get("count") ?? 10);
    const types = (form.getAll("types") as string[]).length
      ? (form.getAll("types") as string[])
      : ["mcq", "true_false", "short_answer"];
    const difficulty = String(form.get("difficulty") ?? "medium");

    if (!files?.length) {
      return NextResponse.json({ error: "Please upload at least one file." }, { status: 400 });
    }

    // Extract text from uploads
    const texts: string[] = [];
    for (const f of files) {
      const t = await extractTextFromFile(f);
      if (t) texts.push(t);
    }
    const merged = truncateForLLM(texts.join("\n\n---\n\n"));
    if (!merged) {
      return NextResponse.json({ error: "No readable text found in uploads." }, { status: 400 });
    }

    const system = [
      "You are a rigorous quiz generator.",
      "Use ONLY the provided notes; do not add external facts.",
      "Return STRICT JSON that matches the schema provided.",
      "For short_answer, include a small array of acceptable answers/keywords.",
      "Include a one-sentence explanation when possible."
    ].join(" ");

    const model = process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini";
    const schemaString = JSON.stringify(QuizJSONSchema);

    const user = [
      `Create a ${count}-question quiz.`,
      `Allowed types: ${types.join(", ")}.`,
      `Target difficulty: ${difficulty}.`,
      `Return ONLY valid JSON (no prose, no code fences).`,
      `The JSON must validate against this JSON Schema:`,
      schemaString,
      `Notes:\n"""${merged}"""`
    ].join("\n\n");

    // Call OpenRouter
    const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        // Optional but recommended by OpenRouter:
        "HTTP-Referer": process.env.SITE_URL || "http://localhost:3000",
        "X-Title": process.env.APP_NAME || "Notes Quiz Generator"
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: system },
          { role: "user",   content: user }
        ],
        temperature: 0.2,
        // Many models respect this; if ignored, our extractor still works.
        response_format: { type: "json_object" },
        max_tokens: 4000
      })
    });

    if (!resp.ok) {
      const text = await resp.text();
      return NextResponse.json({ error: `OpenRouter error: ${text}` }, { status: 502 });
    }

    const data = await resp.json();
    const content: string = data?.choices?.[0]?.message?.content || "";
    const quiz = extractJson(content);

    if (!quiz?.questions?.length) {
      return NextResponse.json(
        { error: "Model did not return valid quiz JSON.", raw: content?.slice?.(0, 600) },
        { status: 500 }
      );
    }

    return NextResponse.json(quiz);
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err?.message || "Failed to generate quiz." }, { status: 500 });
  }
}
