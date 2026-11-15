// app/api/auth/otp/send/route.ts
// Generates and sends a 6-digit OTP to Email (via Gmail) or Phone (via WhatsApp).

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { randomInt } from 'crypto';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { sendOtpEmail, sendOtpPhone } from '@/lib/notify';
import { withTiming } from '@/lib/withTiming';

const Schema = z.object({
  identifier: z.string().min(3),
  type: z.enum(['email', 'phone']).optional().default('email'),
});

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Valid email or phone number is required' }, { status: 400 });
  }

  const { identifier, type } = parsed.data;
  const normalized = identifier.trim().toLowerCase();

  // Generate 6-digit cryptographic OTP
  const otp = randomInt(100000, 999999).toString();
  const expiresAt = Timestamp.fromMillis(Date.now() + 10 * 60 * 1000); // 10 minutes

  try {
    const db = getAdminDb();
    const docId = `${type}_${normalized.replace(/[^a-zA-Z0-9]/g, '_')}`;

    await db.collection('otps').doc(docId).set({
      otp,
      identifier: normalized,
      type,
      expiresAt,
      attempts: 0,
      createdAt: FieldValue.serverTimestamp(),
    });

    let sent = false;
    if (type === 'email') {
      sent = await sendOtpEmail(normalized, otp);
    } else {
      sent = await sendOtpPhone(normalized, otp);
    }

    if (!sent) {
      return NextResponse.json(
        { error: `Could not deliver verification code via ${type}. Please check your ${type} or try another method.` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: `Verification code sent to your ${type}!`,
    });
  } catch (err: any) {
    console.error('[auth/otp/send] Error:', err);
    return NextResponse.json(
      { error: err?.message || 'Error processing OTP request' },
      { status: 500 }
    );
  }
}
