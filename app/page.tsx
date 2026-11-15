// app/page.tsx
// Root redirect: authenticated → based on role; unauthenticated → /login
import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/session';

  export default async function RootPage() {
    const session = await getServerSession();
    if (!session) redirect('/login');
    if (session.role === 'elder') redirect('/elder');
    redirect('/care');
  }
