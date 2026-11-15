// app/api/auth/verify-family/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { resolveFamily } from '@/lib/resolveFamily';

const Schema = z.object({
  familyId: z.string().min(1),
});

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Family Username or ID is required' }, { status: 400 });
  }

  const { familyId: rawId } = parsed.data;
  try {
    const resolved = await resolveFamily(rawId);

    if (!resolved) {
      return NextResponse.json(
        { error: 'We could not find an active workspace with this Family Username or ID. Please check the spelling or create a new workspace.' },
        { status: 404 }
      );
    }

    const { familyId, data, username } = resolved;
    const elderName = data.elder?.nickname || data.elder?.name || data.elderNickname || 'Elder';

    return NextResponse.json({
      ok: true,
      familyId,
      username: username || '',
      elderName,
    });
  } catch (err: any) {
    console.error('[verify-family] Error:', err);
    return NextResponse.json(
      { error: err?.message || 'Database error verifying family workspace.' },
      { status: 500 }
    );
  }
}
