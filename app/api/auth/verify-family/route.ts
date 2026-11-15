// app/api/auth/verify-family/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { withTiming } from '@/lib/withTiming';

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
    return NextResponse.json({ error: 'Family ID is required' }, { status: 400 });
  }

  const { familyId } = parsed.data;
  try {
    const db = getAdminDb();
    const familyDoc = await db.collection('families').doc(familyId).get();

    if (!familyDoc.exists) {
      return NextResponse.json(
        { error: 'We could not find an active workspace with this Family ID. Please verify the ID or register a new family workspace.' },
        { status: 404 }
      );
    }

    const data = familyDoc.data()!;
    const elderName = data.elder?.nickname || data.elder?.name || data.elderNickname || 'Elder';

    return NextResponse.json({ ok: true, elderName });
  } catch (err: any) {
    console.error('[verify-family] Firebase error:', err);
    return NextResponse.json(
      { error: err?.message || 'Database error verifying family workspace.' },
      { status: 500 }
    );
  }
}
