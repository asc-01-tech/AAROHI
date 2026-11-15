// app/elder/records/page.tsx
// Elder Medical Records & Health Profile view.

import React from 'react';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { cookies } from 'next/headers';
import RecordsClient from './RecordsClient';
import type { Locale } from '@/lib/i18n';

export default async function ElderRecordsPage() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('carecircle_session')?.value;
  const session = sessionToken ? await getSession({ cookies: { get: () => ({ value: sessionToken }) } } as any) : null;

  if (!session) {
    redirect('/login');
  }

  return <RecordsClient familyId={session.familyId} />;
}
