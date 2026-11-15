// lib/session.ts
// JWT session cookie helpers using jose (edge-compatible, no Node crypto).
// Cookie: httpOnly, sameSite strict, secure in production, 7-day expiry.

import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

const COOKIE_NAME = 'cc_session';
const MAX_AGE    = 60 * 60 * 24 * 30; // 30 days — persistent elder session

export interface SessionPayload extends JWTPayload {
  familyId: string;
  memberId: string;
  role: 'elder' | 'caretaker' | 'family';
}

function secret(): Uint8Array {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error('SESSION_SECRET too short or missing');
  return new TextEncoder().encode(s);
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret());
}

export async function verifySession(token: string): Promise<SessionPayload> {
  const { payload } = await jwtVerify(token, secret());
  return payload as SessionPayload;
}

/** Read & verify session from the request cookies. Returns null if invalid. */
export async function getSession(req: NextRequest): Promise<SessionPayload | null> {
  try {
    const token = req.cookies.get(COOKIE_NAME)?.value;
    if (!token) return null;
    return await verifySession(token);
  } catch {
    return null;
  }
}

/** Read session inside a Server Component / Route Handler (uses `cookies()`). */
export async function getServerSession(): Promise<SessionPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;
    return await verifySession(token);
  } catch {
    return null;
  }
}

/** Set the session cookie on a NextResponse. */
export function setSessionCookie(res: NextResponse, token: string): void {
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge:   MAX_AGE,
    path:     '/',
  });
}

/** Clear the session cookie. */
export function clearSessionCookie(res: NextResponse): void {
  res.cookies.set(COOKIE_NAME, '', { maxAge: 0, path: '/' });
}

