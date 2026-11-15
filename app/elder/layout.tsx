// app/elder/layout.tsx
// Server component: session gate for elder role.
// Redirects unauthenticated users to /login and non-elders to /care.

import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/session';
import ElderDataProvider from '@/components/ElderDataProvider';

export default async function ElderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();

  if (!session) {
    redirect('/login');
  }

  if (session.role !== 'elder') {
    redirect('/care');
  }

  return (
    <ElderDataProvider
      familyId={session.familyId}
      memberId={session.memberId}
      role={session.role}
    >
      {children}
    </ElderDataProvider>
  );
}
