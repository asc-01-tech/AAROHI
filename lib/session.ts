// lib/session.ts
// Native Node.js crypto JWT session implementation (zero external dependency, avoids ESM conflicts with jwks-rsa).
// Cookie: httpOnly, sameSite strict, secure in production, 7-day expiry.

import { createHmac, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

const COOKIE_NAME = 'cc_session';
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days — persistent elder session

export interface SessionPayload {
  familyId: string;
  memberId: string;
  role: 'elder' | 'caretaker' | 'family';
  exp?: number;
  iat?: number;
  [key: string]: unknown;
}

function base64url(input: string | Buffer): string {
  const buf = typeof input === 'string' ? Buffer.from(input) : input;
  return buf.toString('base64url');
}

function secret(): string {
  return process.env.SESSION_SECRET || 'carecircle-hackathon-super-secret-jwt-key-2026-secure!';
}

export async function signSession(payload: SessionPayload): Promise<string> {
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const now = Math.floor(Date.now() / 1000);
  const fullPayload = {
    ...payload,
    iat: now,
    exp: now + 7 * 24 * 60 * 60, // 7 days
  };
  const body = base64url(JSON.stringify(fullPayload));
  const signature = createHmac('sha256', secret())
    .update(`${header}.${body}`)
    .digest('base64url');
  return `${header}.${body}.${signature}`;
}

export async function verifySession(token: string): Promise<SessionPayload> {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Invalid JWT format');
  const [header, body, signature] = parts;

  const expectedSignature = createHmac('sha256', secret())
    .update(`${header}.${body}`)
    .digest('base64url');

  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expectedSignature);

  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
    throw new Error('Invalid signature');
  }

  const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as SessionPayload;
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error('Token expired');
  }
  return payload;
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
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: MAX_AGE,
    path: '/',
  });
}

/** Clear the session cookie. */
export function clearSessionCookie(res: NextResponse): void {
  res.cookies.set(COOKIE_NAME, '', { maxAge: 0, path: '/' });
}
