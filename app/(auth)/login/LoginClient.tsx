'use client';
// app/(auth)/login/LoginClient.tsx
// Passcode login UI: family ID + 6-digit passcode + role picker.
// Also supports: Google Sign-In, Email OTP.

import { useState, useRef, useEffect } from 'react';
import {
  signInWithCustomToken,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth';
import { getClientAuth } from '@/lib/firebaseClient';

type Role = 'elder' | 'caretaker' | 'family';
type LoginMode = 'passcode' | 'otp';

const ROLE_OPTIONS: { value: Role; label: string; icon: string; desc: string }[] = [
  { value: 'elder', icon: '🧓', label: 'Elder', desc: 'Taking medications' },
  { value: 'caretaker', icon: '👩‍⚕️', label: 'Caretaker', desc: 'Managing care' },
  { value: 'family', icon: '👨‍👩‍👧', label: 'Family', desc: 'Staying informed' },
];

export default function LoginClient() {
  const [loginMode, setLoginMode] = useState<LoginMode>('passcode');
  const [step, setStep] = useState<'id' | 'passcode' | 'role' | 'otp-email' | 'otp-verify'>('id');
  const [familyId, setFamilyId] = useState('');
  const [elderName, setElderName] = useState('');
  const [passcode, setPasscode] = useState('');
  const [role, setRole] = useState<Role>('elder');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notRegistered, setNotRegistered] = useState(false);

  // OTP state
  const [otpEmail, setOtpEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);

  // 6 individual digit inputs for the passcode
  const digitRefs = useRef<(HTMLInputElement | null)[]>([]);
  const idInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
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

  // ── Step 1: Strict Family ID Verification ────────────────────────────────
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
      let data: any = null;
      try { data = await res.json(); } catch { /* not JSON */ }

      if (!res.ok) {
        setNotRegistered(true);
        setError(data?.error || `Server returned error (${res.status}). Please check your setup.`);
        return;
      }

      setElderName(data?.elderName || 'Elder');
      if (data?.familyId) {
        setFamilyId(data.familyId);
      }
      setStep('passcode');
    } catch (err: any) {
      setError(err?.message || 'Connection error. Please check your internet connection.');
    } finally {
      setLoading(false);
    }
  }

  // ── Step 2: Strict Passcode Verification ─────────────────────────────────
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

  // ── Step 3: Complete Login & Set Session ─────────────────────────────────
  async function handleLogin() {
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ familyId: familyId.trim(), passcode, role }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Login failed. Please try again.');
        return;
      }

      // Best-effort Firebase client sign-in
      try {
        const auth = getClientAuth();
        await signInWithCustomToken(auth, data.firebaseToken);
      } catch (fbErr) {
        console.warn('Firebase client signIn skipped:', fbErr);
      }

      window.location.href = '/care';
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  // ── Google Sign-In ────────────────────────────────────────────────────────
  async function handleGoogleSignIn() {
    setLoading(true);
    setError('');

    try {
      const auth = getClientAuth();
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });

      const result = await signInWithPopup(auth, provider);
      const idToken = await result.user.getIdToken();

      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Google sign-in failed. Please try again.');
        return;
      }

      if (data.hasWorkspace) {
        window.location.href = '/care';
      } else {
        // No workspace yet — redirect to setup with email pre-filled
        const email = encodeURIComponent(data.email || '');
        window.location.href = `/setup?email=${email}`;
      }
    } catch (err: any) {
      if (err?.code === 'auth/popup-closed-by-user') {
        setError('Sign-in was cancelled.');
      } else if (err?.code === 'auth/unauthorized-domain') {
        setError('This domain is not authorized. Please contact support.');
      } else {
        setError(err?.message || 'Google sign-in failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  // ── Email OTP ─────────────────────────────────────────────────────────────
  async function handleSendOtp() {
    if (!otpEmail.trim()) {
      setError('Please enter your email address.');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: otpEmail.trim(), type: 'email' }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Could not send verification code. Please try again.');
        return;
      }

      setOtpSent(true);
      setStep('otp-verify');
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp() {
    if (otpCode.length !== 6) {
      setError('Please enter the full 6-digit code.');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: otpEmail.trim(), otp: otpCode, type: 'email' }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Invalid or expired code. Please try again.');
        setOtpCode('');
        return;
      }

      // Best-effort Firebase client sign-in
      try {
        const auth = getClientAuth();
        if (data.firebaseToken) await signInWithCustomToken(auth, data.firebaseToken);
      } catch (fbErr) {
        console.warn('Firebase client signIn skipped:', fbErr);
      }

      if (data.hasWorkspace) {
        window.location.href = '/care';
      } else {
        const email = encodeURIComponent(otpEmail.trim());
        window.location.href = `/setup?email=${email}`;
      }
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  // ── Shared UI helpers ─────────────────────────────────────────────────────
  const GoogleButton = () => (
    <button
      onClick={handleGoogleSignIn}
      disabled={loading}
      className="w-full flex items-center justify-center gap-3 border-2 border-gray-200 rounded-2xl py-3.5 px-4 font-semibold text-gray-700 hover:border-gray-300 hover:bg-gray-50 transition disabled:opacity-50"
    >
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
      </svg>
      Continue with Google
    </button>
  );

  const Divider = () => (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-px bg-gray-200" />
      <span className="text-xs text-gray-400 font-medium">OR</span>
      <div className="flex-1 h-px bg-gray-200" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-100 flex flex-col items-center justify-center p-6">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="text-6xl mb-2">💊</div>
        <h1 className="text-3xl font-bold text-amber-800">Aarohi</h1>
        <p className="text-amber-600 text-sm mt-1">Your family care companion</p>
      </div>

      <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl p-6 space-y-4">

        {/* Error banner */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-red-700 text-sm flex gap-2 items-start">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* ── STEP: Family ID ── */}
        {step === 'id' && (
          <>
            {/* Google Sign-In */}
            <GoogleButton />
            <Divider />

            {/* Login Mode Toggle */}
            <div className="flex rounded-2xl overflow-hidden border-2 border-amber-200">
              <button
                onClick={() => { setLoginMode('passcode'); setError(''); }}
                className={`flex-1 py-2.5 text-sm font-semibold transition ${loginMode === 'passcode' ? 'bg-amber-500 text-white' : 'text-gray-500 hover:bg-amber-50'}`}
              >
                🔑 Passcode
              </button>
              <button
                onClick={() => { setLoginMode('otp'); setStep('otp-email'); setError(''); }}
                className={`flex-1 py-2.5 text-sm font-semibold transition ${loginMode === 'otp' ? 'bg-amber-500 text-white' : 'text-gray-500 hover:bg-amber-50'}`}
              >
                📧 Email OTP
              </button>
            </div>

            {loginMode === 'passcode' && (
              <>
                <div>
                  <label className="block text-base font-semibold text-gray-700 mb-2">Family Handle or ID</label>
                  <input
                    ref={idInputRef}
                    type="text"
                    value={familyId}
                    onChange={e => { setFamilyId(e.target.value); setError(''); setNotRegistered(false); }}
                    onKeyDown={e => e.key === 'Enter' && handleVerifyFamily()}
                    placeholder="e.g. @sharma_family"
                    className="w-full border-2 border-amber-200 rounded-2xl px-4 py-3 text-lg focus:outline-none focus:border-amber-400 font-medium"
                    autoComplete="off"
                    spellCheck={false}
                  />
                  <p className="text-xs text-gray-400 mt-1">Enter your family&apos;s handle (e.g. @sharma_family) or Family ID.</p>
                </div>

                <button
                  onClick={handleVerifyFamily}
                  disabled={!familyId.trim() || loading}
                  className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold text-xl rounded-2xl py-4 transition flex items-center justify-center gap-2 shadow-md shadow-amber-200"
                >
                  {loading ? <><span className="animate-spin">⏳</span> Checking…</> : 'Next →'}
                </button>

                {notRegistered && (
                  <div className="text-center">
                    <p className="text-sm text-gray-600 mb-2">New here?</p>
                    <a href="/setup" className="text-amber-600 font-semibold hover:underline">
                      Create a family workspace
                    </a>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* ── EMAIL OTP: Enter Email ── */}
        {step === 'otp-email' && (
          <>
            <div className="text-center mb-2">
              <span className="text-3xl">📧</span>
              <h2 className="text-xl font-bold text-gray-800 mt-1">Sign in with Email</h2>
              <p className="text-sm text-gray-500 mt-1">We'll send a 6-digit code to your email</p>
            </div>

            <div>
              <label className="block text-base font-semibold text-gray-700 mb-2">Email Address</label>
              <input
                type="email"
                value={otpEmail}
                onChange={e => { setOtpEmail(e.target.value); setError(''); }}
                onKeyDown={e => e.key === 'Enter' && handleSendOtp()}
                placeholder="you@example.com"
                className="w-full border-2 border-amber-200 rounded-2xl px-4 py-3 text-lg focus:outline-none focus:border-amber-400"
                autoComplete="email"
              />
            </div>

            <button
              onClick={handleSendOtp}
              disabled={!otpEmail.trim() || loading}
              className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold text-xl rounded-2xl py-4 transition flex items-center justify-center gap-2 shadow-md shadow-amber-200"
            >
              {loading ? <><span className="animate-spin">⏳</span> Sending…</> : 'Send Code →'}
            </button>

            <button
              onClick={() => { setStep('id'); setLoginMode('passcode'); setError(''); }}
              className="w-full text-gray-500 hover:text-gray-700 py-2 text-sm font-medium"
            >
              ← Back to Family ID
            </button>
          </>
        )}

        {/* ── EMAIL OTP: Verify Code ── */}
        {step === 'otp-verify' && (
          <>
            <div className="text-center mb-2">
              <span className="text-3xl">✉️</span>
              <h2 className="text-xl font-bold text-gray-800 mt-1">Enter Verification Code</h2>
              <p className="text-sm text-gray-500 mt-1">
                Code sent to <span className="font-semibold text-amber-700">{otpEmail}</span>
              </p>
            </div>

            <div>
              <label className="block text-base font-semibold text-gray-700 mb-2 text-center">6-digit code</label>
              <input
                type="tel"
                inputMode="numeric"
                maxLength={6}
                value={otpCode}
                onChange={e => { setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setError(''); }}
                onKeyDown={e => e.key === 'Enter' && otpCode.length === 6 && handleVerifyOtp()}
                placeholder="••••••"
                className="w-full border-2 border-amber-200 rounded-2xl px-4 py-3 text-3xl text-center tracking-widest font-mono focus:outline-none focus:border-amber-400"
                autoComplete="one-time-code"
                autoFocus
              />
            </div>

            <button
              onClick={handleVerifyOtp}
              disabled={otpCode.length !== 6 || loading}
              className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold text-xl rounded-2xl py-4 transition flex items-center justify-center gap-2 shadow-md shadow-amber-200"
            >
              {loading ? <><span className="animate-spin">⏳</span> Verifying…</> : 'Verify & Sign In →'}
            </button>

            <div className="text-center text-sm text-gray-500">
              Didn&apos;t get it?{' '}
              <button
                onClick={() => { setStep('otp-email'); setOtpCode(''); setOtpSent(false); setError(''); }}
                className="text-amber-600 font-semibold hover:underline"
              >
                Resend code
              </button>
            </div>

            <button
              onClick={() => { setStep('id'); setLoginMode('passcode'); setError(''); }}
              className="w-full text-gray-500 hover:text-gray-700 py-2 text-sm font-medium"
            >
              ← Back
            </button>
          </>
        )}

        {/* ── STEP: Passcode Entry ── */}
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
              {loading ? <><span className="animate-spin">⏳</span> Verifying…</> : 'Next →'}
            </button>

            <button
              onClick={() => { setStep('id'); setError(''); setPasscode(''); }}
              className="w-full text-gray-500 hover:text-gray-700 py-2 text-sm font-medium"
            >
              ← Use a different Family ID
            </button>
          </>
        )}

        {/* ── STEP: Role Picker ── */}
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
                    className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition ${
                      role === opt.value
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
              {loading ? <><span className="animate-spin">⏳</span> Signing in…</> : 'Enter Aarohi 🏠'}
            </button>

            <button
              onClick={() => { setStep('passcode'); setError(''); }}
              className="w-full text-gray-500 hover:text-gray-700 py-2 text-sm font-medium"
            >
              ← Back to passcode
            </button>
          </>
        )}

        {/* Footer link */}
        {(step === 'id') && (
          <p className="text-center text-sm text-gray-500">
            New here?{' '}
            <a href="/setup" className="text-amber-600 font-semibold hover:underline">
              Create a family workspace
            </a>
          </p>
        )}

      </div>
    </div>
  );
}
