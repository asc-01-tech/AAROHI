// app/api/interactions/route.ts
// Drug interaction check via Gemini, cached in Firestore for 7 days.

import { NextRequest, NextResponse } from 'next/server';
import { getCachedOrGenerate, generateJSON } from '@/lib/gemini';

export const runtime = 'nodejs';

const HEADERS = { 'Cache-Control': 'private, no-store' };

interface InteractionResult {
  interactions: {
    pair: string;
    severity: 'mild' | 'moderate' | 'severe';
    description: string;
  }[];
  safe: boolean;
  disclaimer: string;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json();
    const { newMeds, existingMeds, familyId } = body as {
      newMeds: string[];
      existingMeds: string[];
      familyId: string;
    };

    if (!Array.isArray(newMeds) || !Array.isArray(existingMeds)) {
      return NextResponse.json(
        { error: 'newMeds and existingMeds must be arrays.' },
        { status: 400, headers: HEADERS }
      );
    }

    // Deterministic cache key: sort all meds together
    const allMeds = [...newMeds, ...existingMeds].map((m) => m.trim().toLowerCase()).sort();
    const cacheKey = 'interactions:' + allMeds.join('|');

    const prompt = `You are a pharmacist AI. Check drug interactions between these medications.
New: ${newMeds.join(', ')}. Existing: ${existingMeds.join(', ')}.
Return ONLY JSON: {"interactions":[{"pair":"DrugA + DrugB","severity":"mild|moderate|severe","description":"plain English explanation"}],"safe":true|false,"disclaimer":"..."}
If no interactions, return {"interactions":[],"safe":true,"disclaimer":"Always consult your doctor."}`;

    const resultStr = await getCachedOrGenerate(
      cacheKey,
      () => generateJSON<InteractionResult>(prompt).then((r) => JSON.stringify(r)),
      7,
      familyId
    );

    const result: InteractionResult = JSON.parse(resultStr);

    return NextResponse.json(result, { status: 200, headers: HEADERS });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { error: message, interactions: [], safe: false },
      { status: 500, headers: HEADERS }
    );
  }
}
