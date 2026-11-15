// lib/withTiming.ts
// Wraps a Next.js Route Handler to log timing and add Server-Timing headers.
// Flags routes that take >500 ms (excluding Gemini routes, logged separately).

import { NextRequest, NextResponse } from 'next/server';

type Handler = (req: NextRequest, ctx?: unknown) => Promise<NextResponse | Response>;

export function withTiming(routeName: string, handler: Handler): Handler {
  return async (req: NextRequest, ctx?: unknown) => {
    const start = performance.now();
    let status = 500;
    try {
      const res = await handler(req, ctx);
      status = res.status;
      return res;
    } finally {
      const ms = Math.round(performance.now() - start);
      const slow = ms > 500 && !routeName.includes('gemini') && !routeName.includes('scan') && !routeName.includes('report');
      console.log(
        `[${routeName}] ${status} — ${ms}ms${slow ? ' ⚠️  SLOW' : ''}`,
      );
      // Server-Timing header helps DevTools in dev
      if (process.env.NODE_ENV !== 'production') {
        // We can't mutate a Response after it's created;
        // callers that need the header should use withTimingHeaders directly.
      }
    }
  };
}

/** Returns a Server-Timing header value for a named measurement. */
export function serverTiming(name: string, ms: number): string {
  return `${name};dur=${ms.toFixed(1)}`;
}

