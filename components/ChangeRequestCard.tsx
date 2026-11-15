// components/ChangeRequestCard.tsx
// Elder consent card: when a family member proposes a medication change,
// the elder holds one-tap authority to approve or decline.

'use client';

import React, { useState } from 'react';
import { Volume2, Check, X } from 'lucide-react';
import type { ChangeRequest } from '@/components/ElderDataProvider';
import { speak } from '@/lib/feedback';

interface Props {
  req: ChangeRequest;
  familyId: string;
  onDecide: (approved: boolean) => void;
}

export default function ChangeRequestCard({ req, onDecide }: Props) {
  const [submitting, setSubmitting] = useState(false);

  const medName = String(req.payload?.medName || 'Medication');
  const details = String(req.payload?.changeSummary || req.type || 'schedule update');
  const requestBy = req.requestedBy || 'Family';

  const promptText = `${requestBy} wants to update ${medName}.`;

  const handleRead = () => {
    speak(`${promptText}. Press green checkmark for yes, or red cross for no.`, 'en-IN');
  };

  const handleAction = async (approved: boolean) => {
    setSubmitting(true);
    try {
      await fetch(`/api/change-requests/${req.reqId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: approved ? 'approved' : 'rejected' }),
      });
      onDecide(approved);
    } catch (err) {
      console.warn('[Change request decision error]', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl p-5 shadow-2xl border-4 border-amber-400">
      <div className="flex items-center justify-between gap-3 mb-2">
        <span className="text-sm font-bold uppercase tracking-wider text-amber-800 bg-amber-100 px-3 py-1 rounded-full">
          Your Approval Needed 🔔
        </span>
        <button
          onClick={handleRead}
          className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-700 hover:bg-amber-100"
          aria-label="Read request aloud"
        >
          <Volume2 size={20} />
        </button>
      </div>

      <h4 className="text-xl font-black text-gray-900 mt-2">
        {requestBy} suggests:
      </h4>
      <p className="text-gray-700 font-bold text-lg mt-1 mb-1">
        {medName}
      </p>
      <p className="text-gray-500 font-semibold text-sm mb-4">
        {details}
      </p>

      {/* Yes / No One-Tap Action Buttons */}
      <div className="flex gap-3">
        <button
          disabled={submitting}
          onClick={() => handleAction(false)}
          className="flex-1 min-h-[56px] rounded-2xl bg-gray-100 hover:bg-red-50 text-red-600 font-black text-lg flex items-center justify-center gap-2 border-2 border-gray-200 active:scale-95 transition"
        >
          <X size={24} />
          <span>No</span>
        </button>

        <button
          disabled={submitting}
          onClick={() => handleAction(true)}
          className="flex-1 min-h-[56px] rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-lg flex items-center justify-center gap-2 shadow-lg active:scale-95 transition"
        >
          <Check size={24} />
          <span>Yes, Agree</span>
        </button>
      </div>
    </div>
  );
}
