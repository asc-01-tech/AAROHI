'use client';
// app/(auth)/login/LoginClient.tsx
// Passcode login UI: family ID + 6-digit passcode + role picker.
// Strict step-by-step verification: Stops invalid family IDs immediately on Step 1.

import { useState, useRef, useEffect } from 'react';
import { signInWithCustomToken } from 'firebase/auth';
import { getClientAuth } from '@/lib/firebaseClient';

type Role = 'elder' | 'caretaker' | 'family';

const ROLE_OPTIONS: { value: Role; label: string; icon: string; desc: string }[] = [
  { value: 'elder', icon: '🧓', label: 'Elder', desc: 'Taking medications' },
  { value: 'caretaker', icon: '👩‍⚕️', label: 'Caretaker', desc: 'Managing care' },
  { value: 'family', icon: '👨‍👩‍👧', label: 'Family', desc: 'Staying informed' },
];

export default function LoginClient() {
  const [step, setStep] = useState<'id' | 'passcode' | 'role'>('id');
  const [familyId, setFamilyId] = useState('');
  const [elderName, setElderName] = useState('');
  const [passcode, setPasscode] = useState('');
  const [role, setRole] = useState<Role>('elder');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notRegistered, setNotRegistered] = useState(false);

  // 6 individual digit inputs for the passcode
  const digitRefs = useRef<(HTMLInputElement | null)[]>([]);
  const idInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    // Focus family input on initial mount
    idInputRef.current?.focus();
  }, []);

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

  // ── Step 1: Strict Family ID Verification ──────────────────────────────────
  async function handleVerifyFamily() {
    const trimmedId = familyId.trim();
    if (!trimmedId) return;

    setLoading(true);
    setError('');
    setNotRegistered(false);

    try {
      const res = await fetch('/api/auth/verify-family', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ familyId: trimmedId }),
      });
      const data = await res.json();

      if (!res.ok) {
        // Stop user here on Step 1 with a professional, helpful message
        setNotRegistered(true);
        setError(data.error || `We couldn't locate a workspace with ID "${trimmedId}".`);
        return;
      }

      setElderName(data.elderName || 'Elder');
      setStep('passcode');
    } catch {
      setError('Connection error. Please check your internet connection.');
    } finally {
      setLoading(false);
    }
  }

  // ── Step 2: Strict Passcode Verification ───────────────────────────────────
  async function handleVerifyPasscode() {
    if (passcode.length !== 6) {
      setError('Please enter all 6 digits of your passcode.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/verify-passcode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ familyId: familyId.trim(), passcode }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Incorrect 6-digit passcode. Please try again.');
        setPasscode('');
        digitRefs.current[0]?.focus();
        return;
      }

      setStep('role');
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  // ── Step 3: Complete Login & Set Session ───────────────────────────────────
  async function handleLogin() {
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ familyId: familyId.trim(), passcode, role }),
      });

      let data: any = {};
      try {
        data = await res.json();
      } catch {
        throw new Error('Server error: invalid response');
      }

      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }

      // Best-effort Firebase client token sign-in
      try {
        const auth = getClientAuth();
        await signInWithCustomToken(auth, data.firebaseToken);
      } catch (fbErr) {
        console.warn('Firebase client signIn skipped:', fbErr);
      }

      // Hard redirect to dashboard ensures fresh cookies are sent
      window.location.href = role === 'elder' ? '/elder' : '/care';
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Login failed');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-100 flex flex-col items-center justify-center p-6">
      {/* Header / Logo */}
      <div className="text-center mb-8">
        <div className="text-6xl mb-2">💊</div>
        <h1 className="text-3xl font-bold text-amber-800">Aarohi</h1>
        <p className="text-amber-600 mt-1">Your family care companion</p>
      </div>

      <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl p-6 space-y-5">

        {/* Workspace Not Found Notice */}
        {notRegistered && step === 'id' && (
          <div className="bg-amber-50/90 border border-amber-200 rounded-2xl p-4 text-amber-950 space-y-2.5 shadow-sm">
            <div className="flex items-start gap-2.5">
              <span className="text-xl leading-none mt-0.5">🔍</span>
              <div>
                <h3 className="font-bold text-sm text-amber-900">
                  Workspace Not Found
                </h3>
                <p className="text-xs text-amber-800/90 mt-1 leading-relaxed">
                  We couldn&apos;t find an active circle matching <span className="font-semibold underline decoration-amber-300 font-mono">&quot;{familyId}&quot;</span>. Please double-check the spelling, or set up a new family workspace.
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-amber-200/60 flex flex-col gap-1.5">
              <a
                href="/setup"
                className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold py-2 px-3 rounded-xl text-xs text-center transition flex items-center justify-center gap-1.5 shadow-sm"
              >
                <span>✨</span>
                <span>Register a new family workspace</span>
              </a>
            </div>
          </div>
        )}

        {/* General Error Banner (for passcodes, connection, etc.) */}
        {error && !notRegistered && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3.5 text-rose-800 text-xs font-semibold flex items-center gap-2">
            <span className="text-base">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* ── STEP 1: FAMILY ID ────────────────────────────────────────────── */}
        {step === 'id' && (
          <>
            <div>
              <label className="block text-lg font-semibold text-gray-700 mb-2">
                Family ID
              </label>
              <input
                ref={idInputRef}
                type="text"
                value={familyId}
                onChange={e => {
                  setFamilyId(e.target.value);
                  setError('');
                  setNotRegistered(false);
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleVerifyFamily();
                }}
                placeholder="e.g. demo-aba-family-2024"
                className={`w-full border-2 rounded-2xl px-4 py-3 text-lg focus:outline-none transition ${notRegistered
                    ? 'border-amber-400 bg-amber-50/30 focus:border-amber-500'
                    : 'border-amber-200 focus:border-amber-400'
                  }`}
                autoCapitalize="none"
                spellCheck={false}
                suppressHydrationWarning
              />
              <p className="text-sm text-gray-500 mt-2">
                Your caretaker has this ID from setup.
              </p>
            </div>

            <button
              onClick={handleVerifyFamily}
              disabled={!familyId.trim() || loading}
              className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold text-xl rounded-2xl py-4 transition flex items-center justify-center gap-2 shadow-md shadow-amber-200"
            >
              {loading ? (
                <><span className="animate-spin">⏳</span> Verifying ID…</>
              ) : (
                'Next →'
              )}
            </button>

            {!notRegistered && (
              <p className="text-center text-gray-500 text-sm">
                New here?{' '}
                <a href="/setup" className="text-amber-600 font-semibold underline hover:text-amber-700">
                  Create a family workspace
                </a>
              </p>
            )}
          </>
        )}

        {/* ── STEP 2: 6-DIGIT PASSCODE ─────────────────────────────────────── */}
        {step === 'passcode' && (
          <>
            <div>
              {elderName && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 text-center mb-3">
                  <span className="text-xs text-amber-600 uppercase tracking-wide font-bold block">Family Workspace</span>
                  <span className="text-lg font-bold text-amber-900">{elderName}&apos;s Family</span>
                </div>
              )}
              <label className="block text-lg font-semibold text-gray-700 mb-3 text-center">
                Enter 6-digit passcode
              </label>
              <div className="flex justify-center gap-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <input
                    key={i}
                    ref={el => { digitRefs.current[i] = el; }}
                    type="tel"
                    inputMode="numeric"
                    maxLength={1}
                    value={passcode[i] || ''}
                    onChange={e => handleDigitChange(i, e.target.value)}
                    onKeyDown={e => handleDigitKeyDown(i, e)}
                    className="w-11 h-14 text-center text-2xl font-bold border-2 border-amber-300 rounded-xl focus:border-amber-500 focus:outline-none transition shadow-sm"
                    aria-label={`Digit ${i + 1}`}
                  />
                ))}
              </div>
            </div>

            <button
              onClick={handleVerifyPasscode}
              disabled={passcode.length !== 6 || loading}
              className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold text-xl rounded-2xl py-4 transition flex items-center justify-center gap-2 shadow-md shadow-amber-200"
            >
              {loading ? (
                <><span className="animate-spin">⏳</span> Verifying…</>
              ) : (
                'Next →'
              )}
            </button>

            <button
              onClick={() => {
                setStep('id');
                setError('');
                setPasscode('');
              }}
              className="w-full text-gray-500 hover:text-gray-700 py-2 text-sm font-medium"
            >
              ← Use a different Family ID
            </button>
          </>
        )}

        {/* ── STEP 3: ROLE PICKER ──────────────────────────────────────────── */}
        {step === 'role' && (
          <>
            <div>
              <label className="block text-xl font-semibold text-gray-700 mb-4 text-center">
                Who are you?
              </label>
              <div className="space-y-3">
                {ROLE_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setRole(opt.value)}
                    className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition ${role === opt.value
                        ? 'border-amber-500 bg-amber-50 shadow-sm'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                  >
                    <span className="text-4xl">{opt.icon}</span>
                    <div className="text-left">
                      <p className="text-lg font-bold text-gray-800">{opt.label}</p>
                      <p className="text-sm text-gray-500">{opt.desc}</p>
                    </div>
                    {role === opt.value && (
                      <span className="ml-auto text-amber-500 text-2xl">✓</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold text-xl rounded-2xl py-4 transition flex items-center justify-center gap-2 shadow-md shadow-amber-200"
            >
              {loading ? (
                <><span className="animate-spin">⏳</span> Signing in…</>
              ) : (
                'Enter Aarohi 🏠'
              )}
            </button>

            <button
              onClick={() => {
                setStep('passcode');
                setError('');
              }}
              className="w-full text-gray-500 hover:text-gray-700 py-2 text-sm font-medium"
            >
              ← Back to passcode
            </button>
          </>
        )}

      </div>
    </div>
  );
}
