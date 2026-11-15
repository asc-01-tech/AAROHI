// app/care/layout.tsx
// Server component layout for caretaker routes.
// Checks session, redirects if not authenticated or is an elder.
import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/session';
import CareDataProvider from '@/components/CareDataProvider';

export default async function CareLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession();

  if (!session) {
    redirect('/login');
  }

  if (session.role === 'elder') {
    redirect('/elder');
  }

  return (
    <CareDataProvider familyId={session.familyId} memberId={session.memberId} role={session.role}>
      {children}
    </CareDataProvider>
  );
}
