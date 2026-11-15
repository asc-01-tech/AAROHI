// app/api/meds/[id]/notify-test/route.ts
// Test trigger for WhatsApp & Email notification delivery
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { notify } from '@/lib/notify';
import { withTiming } from '@/lib/withTiming';

export const runtime = 'nodejs';

export const POST = withTiming('POST /api/meds/notify-test', async (req: NextRequest) => {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = getAdminDb();
  const familyDoc = await db.collection('families').doc(session.familyId).get();
  if (!familyDoc.exists) return NextResponse.json({ error: 'Family not found' }, { status: 404 });

  const family = familyDoc.data()!;
  const elder = family.elder as any;
  const caretaker = (family.members as any[])?.find((m: any) => m.role === 'caretaker') || {
    phone: family.caretakerPhone,
    email: family.caretakerEmail || process.env.GMAIL_USER,
    name: 'Caretaker',
  };

  const nickname = elder?.nickname || 'Aba';
  const locale = elder?.language || 'en-IN';

  const res = await notify(
    {
      phone: caretaker.phone || family.caretakerPhone,
      email: caretaker.email || family.caretakerEmail || process.env.GMAIL_USER,
      name: caretaker.name || 'Caretaker',
    },
    'UPCOMING_DOSE',
    {
      nickname,
      medName: 'Metformin (Test)',
      time: 'Now',
    },
    locale,
    session.familyId
  );

  return NextResponse.json({ ok: true, whatsapp: res.whatsapp, email: res.email });
});
