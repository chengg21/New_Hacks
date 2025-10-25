// src/lib/extract.ts
import Tesseract from "tesseract.js";

async function ocrWithTimeout(buf: Buffer, ms = 45000) {
  return await Promise.race([
    Tesseract.recognize(buf, "eng"),
    new Promise((_, rej) => setTimeout(() => rej(new Error("OCR_TIMEOUT")), ms)),
  ]);
}

export async function extractTextFromFile(file: File): Promise<string> {
  const mime = (file.type || "").toLowerCase();
  const buf = Buffer.from(await file.arrayBuffer());

  // PDF: (temporarily disabled earlier; leave as-is if you chose Option A)
  if (mime === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
    throw new Error("PDF extraction is temporarily disabled. Please upload a .txt file or an image of your notes.");
  }

  // IMAGE → OCR (with timeout)
  if (mime.startsWith("image/")) {
    try {
      // Optional progress logs in server console:
      console.time("OCR");
      const anyRes: any = await ocrWithTimeout(buf, 45000);
      console.timeEnd("OCR");
      const text = anyRes?.data?.text || "";
      if (!text.trim()) throw new Error("EMPTY_OCR");
      return clean(text);
    } catch (e: any) {
      // Throw a friendly error that the client can show
      const reason =
        e?.message === "OCR_TIMEOUT"
          ? "Image OCR timed out. Try a smaller/clearer image or use a .txt file."
          : "Image OCR failed. Try a smaller/clearer image or use a .txt file.";
      throw new Error(reason);
    }
  }

  // Plain text
  return clean(buf.toString("utf-8"));
}

function clean(text: string): string {
  return (text || "").replace(/\r/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

export function truncateForLLM(text: string, maxChars = 50_000): string {
  if (text.length <= maxChars) return text;
  const head = text.slice(0, Math.floor(maxChars * 0.7));
  const tail = text.slice(-Math.floor(maxChars * 0.3));
  return `${head}\n\n[...] (omitted for length)\n\n${tail}`;
}
