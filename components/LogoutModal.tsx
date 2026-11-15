'use client';
// components/LogoutModal.tsx
// Elder-proof logout modal: requires 6-digit family passcode before signing out.
// Prevents accidental logouts by elders or confused family members.

import React, { useState, useRef, useEffect } from 'react';
import { Lock, LogOut, X, AlertCircle } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  familyId: string;
  title?: string;
  description?: string;
}

export default function LogoutModal({
  open,
  onClose,
  familyId,
  title = 'Sign Out & Lock',
  description = 'To keep your scheduled medicines and care reminders safe, please enter your 6-digit family passcode to sign out.',
}: Props) {
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const digitRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (open) {
      setPasscode('');
      setError('');
      setTimeout(() => {
        digitRefs.current[0]?.focus();
      }, 100);
    }
  }, [open]);

  if (!open) return null;

  function handleDigitChange(i: number, val: string) {
    if (!/^\d*$/.test(val)) return;
    setError('');
    const digits = passcode.split('');
    digits[i] = val.slice(-1);
    const next = digits.join('').padEnd(6, '').slice(0, 6);
    setPasscode(next);
    if (val && i < 5) digitRefs.current[i + 1]?.focus();
  }

  function handleDigitKeyDown(i: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !passcode[i] && i > 0) {
      digitRefs.current[i - 1]?.focus();
    }
  }

  async function handleConfirmLogout() {
    if (passcode.length !== 6) {
      setError('Please enter all 6 digits of the passcode.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // 1. Verify passcode first
      const verifyRes = await fetch('/api/auth/verify-passcode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ familyId, passcode }),
      });

      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) {
        setError(verifyData.error || 'Incorrect passcode. You remain safely signed in.');
        setPasscode('');
        digitRefs.current[0]?.focus();
        setLoading(false);
        return;
      }

      // 2. Perform server logout
      await fetch('/api/auth/logout', { method: 'POST' });

      // 3. Clear client and redirect to login
      window.location.href = '/login';
    } catch {
      setError('Could not verify passcode. Please try again.');
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        role="dialog"
        aria-modal="true"
        className="bg-white w-full max-w-sm rounded-3xl p-6 space-y-5 shadow-2xl border border-amber-100 animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header Icon + Close */}
        <div className="flex items-center justify-between">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-800">
            <Lock className="w-6 h-6" />
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Title & Description */}
        <div className="space-y-1">
          <h2 className="text-xl font-black text-gray-900">{title}</h2>
          <p className="text-xs text-gray-600 leading-relaxed">{description}</p>
        </div>

        {/* Error Notice */}
        {error && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3 text-rose-700 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* 6 Digit PIN Boxes */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide text-center">
            Enter 6-Digit Passcode
          </label>
          <div className="flex justify-center gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <input
                key={i}
                ref={(el) => {
                  digitRefs.current[i] = el;
                }}
                type="tel"
                inputMode="numeric"
                maxLength={1}
                value={passcode[i] || ''}
                onChange={(e) => handleDigitChange(i, e.target.value)}
                onKeyDown={(e) => handleDigitKeyDown(i, e)}
                className="w-11 h-14 text-center text-2xl font-bold border-2 border-amber-300 rounded-xl focus:border-amber-500 focus:outline-none transition shadow-sm"
                aria-label={`Digit ${i + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Buttons */}
        <div className="space-y-2 pt-2">
          <button
            onClick={handleConfirmLogout}
            disabled={passcode.length !== 6 || loading}
            className="w-full py-3.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold rounded-2xl text-base transition flex items-center justify-center gap-2 shadow-md shadow-rose-200"
          >
            {loading ? (
              <>
                <span className="animate-spin">⏳</span>
                <span>Checking passcode…</span>
              </>
            ) : (
              <>
                <LogOut className="w-4 h-4" />
                <span>Confirm Sign Out</span>
              </>
            )}
          </button>

          <button
            onClick={onClose}
            className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-2xl text-sm transition"
          >
            Cancel (Stay Signed In)
          </button>
        </div>
      </div>
    </div>
  );
}
