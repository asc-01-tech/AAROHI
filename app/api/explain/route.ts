// app/api/explain/route.ts
// Plain-language medication explanations using Gemini Flash (with caching in globalCache)
import { NextRequest, NextResponse } from 'next/server';
import { getCachedOrGenerate, generateStream } from '@/lib/gemini';
import { withTiming } from '@/lib/withTiming';

export const runtime = 'nodejs';

export const GET = withTiming('GET /api/explain', async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const medName = searchParams.get('medName');
  const lang = searchParams.get('lang') || 'en-IN';
  const stream = searchParams.get('stream') === '1';

  if (!medName) {
    return NextResponse.json({ error: 'Missing medName' }, { status: 400 });
  }

  const prompt = `
You are a loving, gentle doctor explaining a medicine to an elder patient in ${lang}.
Medicine: "${medName}".
Explain in extremely simple words (under 75 words):
1. What it does for their health.
2. When or how to take it.
3. Common gentle advice (e.g. drink plenty of water).
Include this exact disclaimer at the end: "⚠️ Always follow your doctor's exact advice."
`;

  if (stream) {
    const readable = await generateStream(prompt, 15000);
    return new Response(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    });
  }

  const cacheKey = `explain:${medName.toLowerCase().trim()}:${lang}`;
  const explanation = await getCachedOrGenerate(cacheKey, async () => {
    const res = await fetch(`${process.env.APP_URL || 'http://localhost:3000'}/api/explain?medName=${encodeURIComponent(medName)}&lang=${lang}&stream=1`);
    return await res.text();
  }, 7);

  return NextResponse.json({ explanation }, {
    headers: { 'Cache-Control': 'private, no-store' }
  });
});
