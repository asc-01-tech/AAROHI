// lib/gemini.ts
// Singleton Gemini AI client + helpers used across the app.

import { GoogleGenAI } from '@google/genai';
import { createHash } from 'crypto';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

// ─── Singleton ────────────────────────────────────────────────────────────────

let genAIInstance: GoogleGenAI | null = null;

function getGenAI(): GoogleGenAI {
  if (!genAIInstance) {
    const key = process.env.GEMINI_API_KEY || 'AIzaSyPlaceholderForBuild';
    genAIInstance = new GoogleGenAI({ apiKey: key });
  }
  return genAIInstance;
}

const MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';

// ─── generateJSON ─────────────────────────────────────────────────────────────

/**
 * Call Gemini and parse the response as JSON.
 * Strips ```json``` fences if present.
 * Throws on parse failure.
 */
export async function generateJSON<T>(
  prompt: string,
  timeoutMs = 15000
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await getGenAI().models.generateContent({
      model: MODEL,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        thinkingConfig: { thinkingBudget: 0 },
      },
    });

    const raw = response.text ?? '';
    // Strip markdown fences
    const cleaned = raw
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim();

    return JSON.parse(cleaned) as T;
  } finally {
    clearTimeout(timer);
  }
}

// ─── generateStream ───────────────────────────────────────────────────────────

/**
 * Stream Gemini response as a Web ReadableStream<Uint8Array>.
 */
export async function generateStream(
  prompt: string,
  timeoutMs = 20000
): Promise<ReadableStream<Uint8Array>> {
  const encoder = new TextEncoder();

  // Start the stream request
  const responseStream = await getGenAI().models.generateContentStream({
    model: MODEL,
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    config: {
      thinkingConfig: { thinkingBudget: 0 },
    },
  });

  let timer: ReturnType<typeof setTimeout>;

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      timer = setTimeout(() => {
        controller.error(new Error(`generateStream timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      try {
        for await (const chunk of responseStream) {
          const text = chunk.text ?? '';
          if (text) {
            controller.enqueue(encoder.encode(text));
          }
        }
        controller.close();
      } catch (err) {
        controller.error(err);
      } finally {
        clearTimeout(timer);
      }
    },
    cancel() {
      clearTimeout(timer);
    },
  });
}

// ─── getCachedOrGenerate ──────────────────────────────────────────────────────

/**
 * Check Firestore globalCache/{sha256(key)} before calling generate().
 * Stores the result with expiresAt = now + ttlDays * 86400 seconds.
 */
export async function getCachedOrGenerate(
  key: string,
  generate: () => Promise<string>,
  ttlDays = 7,
  _familyId?: string
): Promise<string> {
  const hash = createHash('sha256').update(key).digest('hex');
  const db = getAdminDb();
  const ref = db.collection('globalCache').doc(hash);

  const snap = await ref.get();
  if (snap.exists) {
    const data = snap.data()!;
    const expiresAt: Timestamp = data.expiresAt;
    if (expiresAt && expiresAt.toMillis() > Date.now()) {
      return data.result as string;
    }
  }

  const result = await generate();

  const expiresAt = Timestamp.fromMillis(Date.now() + ttlDays * 86400 * 1000);
  await ref.set(
    {
      result,
      key,
      expiresAt,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  return result;
}
