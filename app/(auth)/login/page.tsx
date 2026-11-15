// app/(auth)/login/page.tsx
// Passcode login — redirects to dashboard if already authenticated.
import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/session';
import LoginClient from './LoginClient';

export const metadata: Metadata = {
  title: 'Login — Aarohi',
};

export default async function LoginPage() {
  const session = await getServerSession();
  if (session) {
    redirect(session.role === 'elder' ? '/elder' : '/care');
  }

  return <LoginClient />;
}

