// app/api/auth/setup/route.ts
// Creates a new family workspace: hashes passcode, writes Firestore, sets session.
// Called once from the Setup page.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { scrypt, randomBytes } from 'crypto';
import { promisify } from 'util';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminDb, createCustomToken } from '@/lib/firebaseAdmin';
import { signSession, setSessionCookie } from '@/lib/session';
import { withTiming } from '@/lib/withTiming';

const scryptAsync = promisify(scrypt);

const SetupSchema = z.object({
  elderName:        z.string().min(1, 'Elder name is required').max(60),
  nickname:         z.string().min(1, 'Nickname is required').max(30),
  nicknameSpoken:   z.string().max(60).optional().or(z.literal('')),
  username:         z.string().max(30).optional().or(z.literal('')),
  language:         z.enum(['en-IN', 'hi-IN', 'mr-IN']),
  age:              z.number().min(1).max(120).optional().nullable(),
  gender:           z.string().max(20).optional(),
  bloodGroup:       z.string().max(10).optional(),
  height:           z.string().max(20).optional(),
  weight:           z.string().max(20).optional(),
  allergies:        z.array(z.string()).optional(),
  conditions:       z.array(z.string()).optional(),
  doctorName:       z.string().max(60).optional(),
  doctorPhone:      z.string().max(20).optional(),
  passcode:         z.string().length(6, 'Passcode must be 6 digits').regex(/^\d{6}$/, 'Passcode must be 6 numeric digits'),
  caretakerName:    z.string().min(1, 'Caretaker name is required').max(60),
  caretakerPhone:   z.string().min(8, 'Phone number must be at least 8 digits').max(20),
  caretakerEmail:   z.string().email('Please enter a valid caretaker email address'),
  elderPhone:       z.string().max(20).optional().or(z.literal('')),
  elderEmail:       z.string().email('Please enter a valid elder email address').optional().or(z.literal('')),
});

function slugifyUsername(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/^@/, '')
    .replace(/[^a-z0-9._-]/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 30);
}

function generateDefaultUsername(elderName: string, nickname: string): string {
  const base = (nickname || elderName)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  const rand = Math.floor(100 + Math.random() * 900);
  return `${base || 'family'}_circle_${rand}`;
}

async function hashPasscode(passcode: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const hash = (await scryptAsync(passcode, salt, 64)) as Buffer;
  return `${salt}:${hash.toString('hex')}`;
}

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = SetupSchema.safeParse(body);
  if (!parsed.success) {
    const errorMsg = parsed.error.issues.map((i) => i.message).join('. ');
    return NextResponse.json({ error: errorMsg }, { status: 400 });
  }
  const data = parsed.data;

  try {
    const db        = getAdminDb();
    const familyRef = db.collection('families').doc(); // auto-id
    const familyId  = familyRef.id;

    // Determine unique Instagram-style username
    let finalUsername = slugifyUsername(data.username || '');
    if (!finalUsername || finalUsername.length < 3) {
      finalUsername = generateDefaultUsername(data.elderName, data.nickname);
    }
    // Check if taken
    const existingSnap = await db.collection('families').where('username', '==', finalUsername).limit(1).get();
    if (!existingSnap.empty) {
      finalUsername = `${finalUsername.slice(0, 24)}_${Math.floor(100 + Math.random() * 900)}`;
    }

    // Caretaker member doc
    const caretakerRef = familyRef.collection('members').doc();
    // Elder "member" doc (virtual; elder's real identity is the family itself)
    const elderRef = familyRef.collection('members').doc();

    const passcodeHash = await hashPasscode(data.passcode);
    const nicknameSpoken = data.nicknameSpoken || data.nickname;

    const batch = db.batch();

    // Family root
    batch.set(familyRef, {
      familyId,
      username:     finalUsername,
      name:         data.elderName + '\'s Family',
      passcodeHash,
      timezone:     'Asia/Kolkata',
      createdAt:    FieldValue.serverTimestamp(),
      elder: {
        name:           data.elderName,
        nickname:       data.nickname,
        nicknameSpoken,
        language:       data.language,
        age:            data.age || null,
        gender:         data.gender || '',
        bloodGroup:     data.bloodGroup || '',
        height:         data.height || '',
        weight:         data.weight || '',
        allergies:      data.allergies || [],
        conditions:     data.conditions || [],
        primaryDoctor:  data.doctorName ? {
          name: data.doctorName,
          phone: data.doctorPhone || '',
          specialty: 'Primary Physician',
          clinic: '',
        } : null,
        phone:          data.elderPhone || '',
        email:          data.elderEmail || '',
      },
      streak:      { current: 0, best: 0, lastFullDay: null },
      plantLevel:  0,
      caretakerPhone: data.caretakerPhone,
      caretakerEmail: data.caretakerEmail,
      settings: {
        reminderLeadMinutes:      10,
        missedGraceMinutes:       15,
        escalateToFamilyAfterMinutes: 30,
      },
      loginAttempts: 0,
      lockUntil:    null,
    });

    // Elder member doc
    batch.set(elderRef, {
      name:          data.elderName,
      role:          'elder',
      phone:         data.elderPhone ?? '',
      email:         data.elderEmail ?? '',
      language:      data.language,
      whatsappJoined: false,
      createdAt:     FieldValue.serverTimestamp(),
    });

    // Caretaker member doc
    batch.set(caretakerRef, {
      name:          data.caretakerName,
      role:          'caretaker',
      phone:         data.caretakerPhone,
      email:         data.caretakerEmail,
      language:      data.language,
      whatsappJoined: false,
      createdAt:     FieldValue.serverTimestamp(),
    });

    await batch.commit();

    // Mint Firebase custom token for the caretaker (who just set up)
    const firebaseToken = createCustomToken(caretakerRef.id, {
      familyId,
      memberId: caretakerRef.id,
      role:     'caretaker',
    });

    // Session JWT
    const sessionToken = await signSession({
      familyId,
      memberId: caretakerRef.id,
      role:     'caretaker',
    });

    const res = NextResponse.json({
      ok: true,
      familyId,
      username:      finalUsername,
      passcode:      data.passcode, // return once to show on screen
      firebaseToken,
    });
    setSessionCookie(res, sessionToken);
    return res;
  } catch (err: any) {
    console.error('[auth/setup] Error creating workspace:', err);
    return NextResponse.json(
      { error: err?.message || 'Database error creating workspace. Please verify Firebase credentials in Vercel.' },
      { status: 500 }
    );
  }
}

