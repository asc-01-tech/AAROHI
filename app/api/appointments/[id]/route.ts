// app/api/appointments/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { Timestamp } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { getSession } from '@/lib/session';
import { withTiming } from '@/lib/withTiming';

const UpdateSchema = z.object({
  doctorName: z.string().min(1).max(100).optional(),
  specialty:  z.string().max(80).optional(),
  location:   z.string().max(200).optional(),
  dateTime:   z.string().datetime().optional(),
  notes:      z.string().max(500).optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

export const PUT = withTiming('appointments/[id]/PUT', async (req: NextRequest, ctx: unknown) => {
  const { params } = ctx as RouteContext;
  const { id } = await params;
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const update: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.dateTime) {
    update.dateTime = Timestamp.fromDate(new Date(parsed.data.dateTime));
  }

  const db  = getAdminDb();
  await db.collection('families').doc(session.familyId)
    .collection('appointments').doc(id)
    .update(update);
  return NextResponse.json({ ok: true });
});

export const DELETE = withTiming('appointments/[id]/DELETE', async (req: NextRequest, ctx: unknown) => {
  const { params } = ctx as RouteContext;
  const { id } = await params;
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.role !== 'caretaker') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const db = getAdminDb();
  await db.collection('families').doc(session.familyId)
    .collection('appointments').doc(id)
    .delete();
  return NextResponse.json({ ok: true });
});

