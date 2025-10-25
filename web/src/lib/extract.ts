// src/lib/extract.ts
// Extract text from PDFs, images, or plain-text files for the quiz prompt.

import Tesseract from "tesseract.js";

// Load pdfjs-dist v3 from either legacy or build path (Next 16 friendly)
async function loadPdfJs() {
  try {
    // Preferred in v3
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const m1: any = await import("pdfjs-dist/legacy/build/pdf.js");
    return m1;
  } catch {
    // Fallback (some installs expose only build/pdf.js)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const m2: any = await import("pdfjs-dist/build/pdf.js");
    return m2;
  }
}

export async function extractTextFromFile(file: File): Promise<string> {
  const mime = (file.type || "").toLowerCase();
  const buf = Buffer.from(await file.arrayBuffer());

  // --- PDF via pdfjs-dist v3 ---
  if (mime === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
    const pdfjsLib = await loadPdfJs();
    const loadingTask = pdfjsLib.getDocument({ data: buf });
    const doc = await loadingTask.promise;

    let text = "";
    const maxPages = Math.min(doc.numPages, 50); // safety cap
    for (let p = 1; p <= maxPages; p++) {
      const page = await doc.getPage(p);
      const content = await page.getTextContent();
      for (const item of content.items as any[]) {
        if (typeof item?.str === "string") text += item.str + " ";
      }
      text += "\n";
    }
    return clean(text);
  }

  // --- Image (OCR) ---
  if (mime.startsWith("image/")) {
    const { data } = await Tesseract.recognize(buf, "eng");
    return clean(data?.text || "");
  }

  // --- Plain text / everything else ---
  return clean(buf.toString("utf-8"));
}

function clean(text: string): string {
  return (text || "")
    .replace(/\r/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// Keep prompts within a safe size for LLMs.
export function truncateForLLM(text: string, maxChars = 50_000): string {
  if (text.length <= maxChars) return text;
  const head = text.slice(0, Math.floor(maxChars * 0.7));
  const tail = text.slice(-Math.floor(maxChars * 0.3));
  return `${head}\n\n[...] (omitted for length)\n\n${tail}`;
}


