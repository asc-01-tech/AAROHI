// app/elder/records/RecordsClient.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import MedicalRecordsView from '@/components/MedicalRecordsView';
import type { Locale } from '@/lib/i18n';
import { getTranslations } from '@/lib/translations';

export default function RecordsClient({ familyId }: { familyId: string }) {
  const router = useRouter();
  const [locale, setLocale] = useState<Locale>('en-IN');

  useEffect(() => {
    try {
      const stored = localStorage.getItem('carecircle_user_locale') as Locale | null;
      if (stored && (stored === 'mr-IN' || stored === 'hi-IN' || stored === 'en-IN')) {
        setLocale(stored);
      }
    } catch {}
  }, []);

  const t = getTranslations(locale);

  return (
    <div className="max-w-md mx-auto min-h-screen bg-gradient-to-b from-amber-50 to-orange-100 flex flex-col justify-between p-4 pb-12">
      {/* Top Header */}
      <div className="flex items-center justify-between mb-4 pt-2">
        <button
          onClick={() => router.back()}
          className="p-3 bg-white/80 backdrop-blur rounded-2xl shadow-sm text-gray-700"
          aria-label="Back"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <span className="font-black text-amber-900 text-lg">{t.recordsTitle}</span>
        <div className="w-10" />
      </div>

      {/* Main Records Container */}
      <div className="flex-1">
        <MedicalRecordsView locale={locale} isCaretaker={false} />
      </div>
    </div>
  );
}
