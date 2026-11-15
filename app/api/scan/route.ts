// app/api/scan/route.ts
// Multimodal Gemini endpoint: extract medications from a prescription photo.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { GoogleGenAI } from '@google/genai';

export const maxDuration = 60;
export const runtime = 'nodejs';

let genAIInstance: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI {
  if (!genAIInstance) {
    const key = process.env.GEMINI_API_KEY || 'AIzaSyPlaceholderForBuild';
    genAIInstance = new GoogleGenAI({ apiKey: key });
  }
  return genAIInstance;
}

const DISCLAIMER =
  'AI-generated. Always verify with your pharmacist or doctor.';

const MedSchema = z.object({
  name: z.string(),
  strength: z.string().optional(),
  form: z.enum(['capsule', 'tablet', 'syrup', 'injection']),
  timesPerDay: z.number(),
  times: z.array(z.string()),
  durationDays: z.number().optional(),
  instructions: z.string().optional(),
  confidence: z.number(),
});

const MedArraySchema = z.array(MedSchema);

const SCAN_PROMPT = `You are a medical AI. Extract all medications from this prescription photo.
Return ONLY a JSON array (no markdown). Each item:
{"name":"string","strength":"string","form":"capsule|tablet|syrup|injection","timesPerDay":number,"times":["HH:MM"],"durationDays":number,"instructions":"string","confidence":0.0-1.0}
If no meds found, return []. Be conservative — only include clearly readable items.`;

export async function POST(req: NextRequest): Promise<NextResponse> {
  const headers = {
    'Cache-Control': 'private, no-store',
  };

  try {
    const formData = await req.formData();
    const file = formData.get('image') as File | Blob | null;

    if (!file) {
      return NextResponse.json(
        { meds: [], error: 'No image provided.', disclaimer: DISCLAIMER },
        { status: 400, headers }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const mimeType = (file as File).type || 'image/jpeg';

    const response = await getGenAI().models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType,
                data: base64,
              },
            },
            { text: SCAN_PROMPT },
          ],
        },
      ],
      config: {
        thinkingConfig: { thinkingBudget: 0 },
      },
    });

    const raw = (response.text ?? '').trim();
    const cleaned = raw
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim();

    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      return NextResponse.json(
        { meds: [], error: 'Failed to parse AI response.', disclaimer: DISCLAIMER },
        { status: 200, headers }
      );
    }

    const validated = MedArraySchema.safeParse(parsed);
    if (!validated.success) {
      return NextResponse.json(
        { meds: [], error: 'AI response did not match expected format.', disclaimer: DISCLAIMER },
        { status: 200, headers }
      );
    }

    return NextResponse.json(
      { meds: validated.data, disclaimer: DISCLAIMER },
      { status: 200, headers }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { meds: [], error: message, disclaimer: DISCLAIMER },
      { status: 200, headers }
    );
  }
}
