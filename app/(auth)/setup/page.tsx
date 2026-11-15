// app/(auth)/setup/page.tsx
import { Metadata } from 'next';
import SetupClient from './SetupClient';

export const metadata: Metadata = {
  title: 'Create Family Workspace — Aarohi',
};

export default function SetupPage() {
  return <SetupClient />;
}

