'use client';
// app/(auth)/setup/SetupClient.tsx
// Create a new family workspace — one-time setup by caretaker.

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithCustomToken } from 'firebase/auth';
import { getClientAuth } from '@/lib/firebaseClient';

type Step = 'elder' | 'caretaker' | 'passcode' | 'done';

const LANGUAGES = [
  { value: 'en-IN', label: 'English' },
  { value: 'hi-IN', label: 'हिंदी (Hindi)' },
  { value: 'mr-IN', label: 'मराठी (Marathi)' },
];

export default function SetupClient() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('elder');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form data
  const [elderName, setElderName] = useState('');
  const [nickname, setNickname] = useState('');
  const [nicknameSpoken, setNicknameSpoken] = useState('');
  const [language, setLanguage] = useState('en-IN');
  const [elderPhone, setElderPhone] = useState('');
  const [elderEmail, setElderEmail] = useState('');
  const [caretakerName, setCaretakerName] = useState('');
  const [caretakerPhone, setCaretakerPhone] = useState('');
  const [caretakerEmail, setCaretakerEmail] = useState('');
  const [passcode, setPasscode] = useState('');
  const [familyId, setFamilyId] = useState('');
  const [shownPasscode, setShownPasscode] = useState('');

  // Auto-fill nicknameSpoken when nickname changes (default: same text)
  function handleNickname(val: string) {
    setNickname(val);
    if (!nicknameSpoken) setNicknameSpoken(val);
  }

  async function handleSubmit() {
    if (passcode.length !== 6) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          elderName: elderName.trim(),
          nickname: nickname.trim(),
          nicknameSpoken: (nicknameSpoken || nickname).trim(),
          language,
          elderPhone: elderPhone.trim() || undefined,
          elderEmail: elderEmail.trim() || undefined,
          caretakerName: caretakerName.trim(),
          caretakerPhone: caretakerPhone.trim(),
          caretakerEmail: caretakerEmail.trim(),
          passcode,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        let errorText = 'Setup failed. Please check all fields.';
        if (typeof data.error === 'string') {
          errorText = data.error;
        } else if (data.error && typeof data.error === 'object') {
          errorText = data.error.message || (Array.isArray(data.error.issues) ? data.error.issues.map((i: any) => i.message).join(', ') : JSON.stringify(data.error));
        }
        throw new Error(errorText);
      }

      // Best-effort Firebase client token sign-in
      try {
        const auth = getClientAuth();
        await signInWithCustomToken(auth, data.firebaseToken);
      } catch (fbErr) {
        console.warn('Firebase client signIn skipped:', fbErr);
      }

      setFamilyId(data.familyId);
      setShownPasscode(data.passcode);
      setStep('done');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Setup failed');
    } finally {
      setLoading(false);
    }
  }

  const inputClass = "w-full border-2 border-amber-200 rounded-2xl px-4 py-3 text-lg focus:outline-none focus:border-amber-400";
  const labelClass = "block text-base font-semibold text-gray-700 mb-1";

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-100 flex flex-col items-center justify-start p-6 pb-12">
      <div className="text-center mb-6 mt-4">
        <div className="text-5xl mb-2">💊</div>
        <h1 className="text-2xl font-bold text-amber-800">Create Family Workspace</h1>
        <p className="text-amber-600 text-sm mt-1">Set up Aarohi for your family</p>
      </div>

      <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl p-6 space-y-5">

        {/* Step: Elder Info */}
        {step === 'elder' && (
          <>
            <h2 className="text-xl font-bold text-gray-800">👴 About the Elder</h2>
            <div>
              <label className={labelClass}>Full Name</label>
              <input className={inputClass} value={elderName} onChange={e => setElderName(e.target.value)} placeholder="e.g. Ramesh Sharma" />
            </div>
            <div>
              <label className={labelClass}>Nickname (what family calls them)</label>
              <input className={inputClass} value={nickname} onChange={e => handleNickname(e.target.value)} placeholder="e.g. Aba, Aaji, Dadaji" />
            </div>
            <div>
              <label className={labelClass}>Nickname in native script (for voice)</label>
              <input className={inputClass} value={nicknameSpoken} onChange={e => setNicknameSpoken(e.target.value)} placeholder="e.g. आबा, आजी" />
              <p className="text-xs text-gray-400 mt-1">The app will speak this name aloud. Use Devanagari for Hindi/Marathi.</p>
            </div>
            <div>
              <label className={labelClass}>Language</label>
              <select className={inputClass} value={language} onChange={e => setLanguage(e.target.value)}>
                {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Phone (optional)</label>
              <input className={inputClass} value={elderPhone} onChange={e => setElderPhone(e.target.value)} placeholder="+91 9876543210" type="tel" />
            </div>
            <div>
              <label className={labelClass}>Email (optional)</label>
              <input className={inputClass} value={elderEmail} onChange={e => setElderEmail(e.target.value)} placeholder="elder@email.com" type="email" />
            </div>
            <button
              onClick={() => { if (elderName && nickname) setStep('caretaker'); }}
              disabled={!elderName || !nickname}
              className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold text-xl rounded-2xl py-4"
            >
              Next →
            </button>
          </>
        )}

        {/* Step: Caretaker Info */}
        {step === 'caretaker' && (
          <>
            <h2 className="text-xl font-bold text-gray-800">👩‍⚕️ Primary Caretaker</h2>
            <div>
              <label className={labelClass}>Your Name</label>
              <input className={inputClass} value={caretakerName} onChange={e => setCaretakerName(e.target.value)} placeholder="e.g. Priya Sharma" />
            </div>
            <div>
              <label className={labelClass}>WhatsApp Phone</label>
              <input className={inputClass} value={caretakerPhone} onChange={e => setCaretakerPhone(e.target.value)} placeholder="+91 9876543210" type="tel" />
            </div>
            <div>
              <label className={labelClass}>Email</label>
              <input className={inputClass} value={caretakerEmail} onChange={e => setCaretakerEmail(e.target.value)} placeholder="caretaker@email.com" type="email" />
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-sm text-blue-700">
              <p className="font-semibold mb-1">📱 WhatsApp Setup</p>
              <p>To receive WhatsApp alerts, join the sandbox: send <strong>"join &lt;code&gt;"</strong> to <strong>+1 415 523 8886</strong>. We'll show you the code after setup.</p>
            </div>
            <button
              onClick={() => { if (caretakerName && caretakerPhone && caretakerEmail) setStep('passcode'); }}
              disabled={!caretakerName || !caretakerPhone || !caretakerEmail}
              className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold text-xl rounded-2xl py-4"
            >
              Next →
            </button>
            <button onClick={() => setStep('elder')} className="w-full text-gray-500 py-2">← Back</button>
          </>
        )}

        {/* Step: Passcode */}
        {step === 'passcode' && (
          <>
            <h2 className="text-xl font-bold text-gray-800">🔐 Set a Passcode</h2>
            <p className="text-gray-500 text-sm">Choose a 6-digit number that all family members will use to log in.</p>
            <input
              type="tel"
              inputMode="numeric"
              maxLength={6}
              value={passcode}
              onChange={e => setPasscode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="6-digit passcode"
              className={`${inputClass} text-center text-3xl tracking-widest`}
            />
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-red-700 text-sm">{error}</div>
            )}
            <button
              onClick={handleSubmit}
              disabled={passcode.length !== 6 || loading}
              className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold text-xl rounded-2xl py-4 flex items-center justify-center gap-2"
            >
              {loading ? <><span className="animate-spin">⏳</span> Creating…</> : 'Create Workspace 🎉'}
            </button>
            <button onClick={() => setStep('caretaker')} className="w-full text-gray-500 py-2">← Back</button>
          </>
        )}

        {/* Done */}
        {step === 'done' && (
          <div className="text-center space-y-4">
            <div className="text-6xl">🎉</div>
            <h2 className="text-2xl font-bold text-green-700">Workspace Created!</h2>
            <p className="text-gray-600">Share these details with your family:</p>
            <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 space-y-2">
              <p className="text-sm text-gray-500 font-semibold">FAMILY ID</p>
              <p className="text-lg font-mono font-bold text-gray-800 break-all">{familyId}</p>
              <p className="text-sm text-gray-500 font-semibold mt-3">PASSCODE</p>
              <p className="text-4xl font-mono font-bold tracking-widest text-amber-700">{shownPasscode}</p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-sm text-blue-700 text-left">
              <p className="font-semibold mb-1">📱 WhatsApp Setup</p>
              <p>Send <strong>"join &lt;sandbox-code&gt;"</strong> to <strong>+1 415 523 8886</strong> on WhatsApp to receive medication alerts. Get the sandbox code from your Twilio console.</p>
            </div>
            <button
              onClick={() => router.replace('/care')}
              className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold text-xl rounded-2xl py-4"
            >
              Go to Dashboard 🏠
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

