"use client";
import React, { useState } from "react";
import type { QuizPayload, QuizQuestion, QuizType } from "@/types";

export default function Home() {
  const [files, setFiles] = useState<FileList | null>(null);
  const [count, setCount] = useState(8);
  const [types, setTypes] = useState<Record<QuizType, boolean>>({
    mcq: true, true_false: true, short_answer: true
  });
  const [difficulty, setDifficulty] = useState<"easy"|"medium"|"hard">("medium");
  const [loading, setLoading] = useState(false);
  const [quiz, setQuiz] = useState<QuizPayload | null>(null);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [score, setScore] = useState<{correct:number,total:number}|null>(null);

  function toggleType(t: QuizType) {
    setTypes(p => ({ ...p, [t]: !p[t] }));
  }

  async function generate() {
    if (!files || files.length === 0) {
      alert("Upload at least one file (.pdf / .txt / image).");
      return;
    }
    const selected = (Object.keys(types) as QuizType[]).filter(t => types[t]);
    if (selected.length === 0) { alert("Select at least one question type."); return; }

    setLoading(true); setQuiz(null); setAnswers({}); setScore(null);

    const fd = new FormData();
    Array.from(files).forEach(f => fd.append("files", f));
    fd.append("count", String(count));
    selected.forEach(t => fd.append("types", t));
    fd.append("difficulty", difficulty);

    const res = await fetch("/api/generate", { method: "POST", body: fd });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) { alert(data?.error || "Failed to generate."); return; }
    setQuiz(data);
  }

  function setAns(id: string, v: any) { setAnswers(a => ({...a, [id]: v})); }
  function norm(s: string) { return s.toLowerCase().replace(/\s+/g, " ").trim(); }

  function grade() {
    if (!quiz) return;
    let correct = 0;
    quiz.questions.forEach((q: QuizQuestion) => {
      const user = answers[q.id];
      if (q.type === "mcq" && typeof q.answer === "number") {
        if (Number(user) === q.answer) correct++;
      } else if (q.type === "true_false" && typeof q.answer === "boolean") {
        if (String(user) === String(q.answer)) correct++;
      } else if (q.type === "short_answer" && Array.isArray(q.answer)) {
        const u = norm(String(user || ""));
        if (q.answer.some(acc => u.includes(norm(acc)))) correct++;
      }
    });
    setScore({ correct, total: quiz.questions.length });
  }

  return (
    <main className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">Study Notes → Quiz Generator</h1>

      <div className="bg-white text-gray-900 rounded-xl border p-4 space-y-4">
        <div>
          <label className="font-medium">Upload files (PDF / images / text)</label>
        <input
            type="file"
            multiple
            accept=".pdf,.txt,image/*"
            onChange={e => setFiles(e.target.files)}
            className="mt-2"
          />
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label className="font-medium"># of questions</label>
            <input
              type="number"
              min={1}
              max={100}
              value={count}
              onChange={e => setCount(Number(e.target.value))}
              className="mt-2 w-full border rounded p-2"
            />
          </div>

          <div>
            <label className="font-medium">Question types</label>
            <div className="mt-2 space-y-1">
              {(["mcq","true_false","short_answer"] as QuizType[]).map(t => (
                <label key={t} className="block">
                  <input
                    type="checkbox"
                    className="mr-2"
                    checked={types[t]}
                    onChange={() => toggleType(t)}
                  />
                  {t.replace("_"," / ")}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="font-medium">Difficulty</label>
            <select
              value={difficulty}
              onChange={e => setDifficulty(e.target.value as any)}
              className="mt-2 w-full border rounded p-2"
            >
              <option>easy</option>
              <option>medium</option>
              <option>hard</option>
            </select>
          </div>
        </div>

        <button
          onClick={generate}
          disabled={loading}
          className="bg-black text-white rounded-lg px-4 py-2 disabled:opacity-60"
        >
          {loading ? "Generating…" : "Generate quiz"}
        </button>
      </div>

      {quiz && (
        <div className="mt-6 bg-white text-gray-900 rounded-xl border p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Quiz</h2>
            <div className="text-sm text-gray-600">
              {quiz.meta.question_count} items · {quiz.meta.types.join(", ")}
            </div>
          </div>
          <hr className="my-3" />
          {quiz.questions.map((q) => (
            <div key={q.id} className="mb-4">
              <div className="font-medium">Q{q.id}. {q.prompt}</div>

              {q.type === "mcq" && q.choices && (
                <div className="mt-2 space-y-1">
                  {q.choices.map((c, i) => (
                    <label key={i} className="block">
                      <input
                        type="radio"
                        name={`q-${q.id}`}
                        className="mr-2"
                        checked={String(answers[q.id]) === String(i)}
                        onChange={() => setAns(q.id, i)}
                      />
                      {c}
                    </label>
                  ))}
                </div>
              )}

              {q.type === "true_false" && (
                <div className="mt-2 space-y-1">
                  <label className="block">
                    <input
                      type="radio"
                      name={`q-${q.id}`}
                      className="mr-2"
                      checked={answers[q.id] === "true"}
                      onChange={() => setAns(q.id, "true")}
                    />
                    True
                  </label>
                  <label className="block">
                    <input
                      type="radio"
                      name={`q-${q.id}`}
                      className="mr-2"
                      checked={answers[q.id] === "false"}
                      onChange={() => setAns(q.id, "false")}
                    />
                    False
                  </label>
                </div>
              )}

              {q.type === "short_answer" && (
                <input
                  className="mt-2 w-full border rounded p-2"
                  placeholder="Your answer"
                  value={answers[q.id] ?? ""}
                  onChange={e => setAns(q.id, e.target.value)}
                />
              )}
            </div>
          ))}

          <button onClick={grade} className="bg-black text-white rounded-lg px-4 py-2">
            Submit
          </button>

          {score && (
            <div className="mt-3">
              <div className="font-semibold">Score: {score.correct} / {score.total}</div>
              <details className="mt-2">
                <summary className="cursor-pointer">Show answers & explanations</summary>
                <ul className="mt-2 list-disc pl-6 space-y-1">
                  {quiz.questions.map((q) => (
                    <li key={q.id}>
                      <b>Q{q.id}</b> — {q.type} · <i>{q.explanation || "—"}</i>
                    </li>
                  ))}
                </ul>
              </details>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
