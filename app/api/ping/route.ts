import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    ok: true,
    node: process.version,
    env_keys: Object.keys(process.env).filter(k => !k.includes('KEY') && !k.includes('SECRET')),
  });
}
