'use client';
// app/(auth)/setup/SetupClient.tsx
// Create a new family workspace — one-time setup by caretaker.

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithCustomToken } from 'firebase/auth';
import { getClientAuth } from '@/lib/firebaseClient';

type Step = 'elder' | 'health' | 'caretaker' | 'passcode' | 'done';

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
  const [username, setUsername] = useState('');
  const [language, setLanguage] = useState('en-IN');
  const [elderPhone, setElderPhone] = useState('');
  const [elderEmail, setElderEmail] = useState('');

  // Elder Health details (manually entered by caretaker)
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [allergies, setAllergies] = useState('');
  const [conditions, setConditions] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [doctorPhone, setDoctorPhone] = useState('');

  const [caretakerName, setCaretakerName] = useState('');
  const [caretakerPhone, setCaretakerPhone] = useState('');
  const [caretakerEmail, setCaretakerEmail] = useState('');
  const [passcode, setPasscode] = useState('');
  const [familyId, setFamilyId] = useState('');
  const [shownUsername, setShownUsername] = useState('');
  const [shownPasscode, setShownPasscode] = useState('');
  const [copied, setCopied] = useState(false);

  // Auto-fill nicknameSpoken and username when nickname/elderName changes
  function handleElderName(val: string) {
    setElderName(val);
    if (!username) {
      const slug = val.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
      if (slug) setUsername(`${slug}_family`);
    }
  }

  function handleNickname(val: string) {
    setNickname(val);
    if (!nicknameSpoken) setNicknameSpoken(val);
    if (!username && val) {
      const slug = val.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
      if (slug) setUsername(`${slug}_circle`);
    }
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
          username: username.trim() || undefined,
          language,
          age: age ? Number(age) : undefined,
          gender: gender || undefined,
          bloodGroup: bloodGroup || undefined,
          height: height.trim() || undefined,
          weight: weight.trim() || undefined,
          allergies: allergies.split(',').map(s => s.trim()).filter(Boolean),
          conditions: conditions.split(',').map(s => s.trim()).filter(Boolean),
          doctorName: doctorName.trim() || undefined,
          doctorPhone: doctorPhone.trim() || undefined,
          elderPhone: elderPhone.trim() || undefined,
          elderEmail: elderEmail.trim() || undefined,
          caretakerName: caretakerName.trim(),
          caretakerPhone: caretakerPhone.trim(),
          caretakerEmail: caretakerEmail.trim(),
          passcode,
        }),
      });

      let data: any = null;
      try {
        data = await res.json();
      } catch {
        // response was not JSON
      }

      if (!res.ok) {
        let errorText = data?.error || `Server error (${res.status}). Please check Vercel logs or database setup.`;
        if (typeof data?.error === 'object') {
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
      setShownUsername(data.username || username.trim() || data.familyId);
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
              <input className={inputClass} value={elderName} onChange={e => handleElderName(e.target.value)} placeholder="e.g. Ramesh Sharma" />
            </div>
            <div>
              <label className={labelClass}>Nickname (what family calls them)</label>
              <input className={inputClass} value={nickname} onChange={e => handleNickname(e.target.value)} placeholder="e.g. Aba, Aaji, Dadaji" />
            </div>
            <div>
              <label className={labelClass}>Family Handle (@username)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold text-amber-500 select-none">@</span>
                <input
                  className={`${inputClass} pl-9 font-semibold text-gray-800`}
                  value={username}
                  onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ''))}
                  placeholder="e.g. sharma_family"
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">Like an Instagram handle. Your entire family will log in using this name!</p>
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
              onClick={() => { if (elderName && nickname) setStep('health'); }}
              disabled={!elderName || !nickname}
              className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold text-xl rounded-2xl py-4 shadow-md shadow-amber-200"
            >
              Next: Health Details →
            </button>
          </>
        )}

        {/* Step: Health Details (Manually entered by Caretaker) */}
        {step === 'health' && (
          <>
            <div>
              <span className="text-3xl">🩺</span>
              <h2 className="text-xl font-bold text-gray-800 mt-1">Health Details for {nickname || elderName}</h2>
              <p className="text-xs text-gray-500 mt-0.5">Enter their actual medical profile (no dummy data)</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Age</label>
                <input
                  type="number"
                  min="1"
                  max="120"
                  className={inputClass}
                  value={age}
                  onChange={e => setAge(e.target.value)}
                  placeholder="e.g. 72"
                />
              </div>
              <div>
                <label className={labelClass}>Gender</label>
                <select className={inputClass} value={gender} onChange={e => setGender(e.target.value)}>
                  <option value="">Select…</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Blood Group</label>
                <select className={inputClass} value={bloodGroup} onChange={e => setBloodGroup(e.target.value)}>
                  <option value="">Select…</option>
                  {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(bg => (
                    <option key={bg} value={bg}>{bg}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Height</label>
                <input
                  type="text"
                  className={inputClass}
                  value={height}
                  onChange={e => setHeight(e.target.value)}
                  placeholder="e.g. 165 cm"
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>Weight</label>
              <input
                type="text"
                className={inputClass}
                value={weight}
                onChange={e => setWeight(e.target.value)}
                placeholder="e.g. 68 kg"
              />
            </div>

            <div>
              <label className={labelClass}>Known Allergies <span className="text-xs text-gray-400 font-normal">(comma-separated)</span></label>
              <input
                type="text"
                className={inputClass}
                value={allergies}
                onChange={e => setAllergies(e.target.value)}
                placeholder="e.g. Penicillin, Peanuts (leave blank if none)"
              />
            </div>

            <div>
              <label className={labelClass}>Chronic Conditions <span className="text-xs text-gray-400 font-normal">(comma-separated)</span></label>
              <input
                type="text"
                className={inputClass}
                value={conditions}
                onChange={e => setConditions(e.target.value)}
                placeholder="e.g. Diabetes, Blood Pressure (leave blank if none)"
              />
            </div>

            <div>
              <label className={labelClass}>Primary Doctor Name (optional)</label>
              <input
                type="text"
                className={inputClass}
                value={doctorName}
                onChange={e => setDoctorName(e.target.value)}
                placeholder="e.g. Dr. Verma"
              />
            </div>

            <div>
              <label className={labelClass}>Doctor Phone (optional)</label>
              <input
                type="tel"
                className={inputClass}
                value={doctorPhone}
                onChange={e => setDoctorPhone(e.target.value)}
                placeholder="+91 9876543210"
              />
            </div>

            <button
              onClick={() => setStep('caretaker')}
              className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold text-xl rounded-2xl py-4 shadow-md shadow-amber-200"
            >
              Next: Caretaker Info →
            </button>
            <button onClick={() => setStep('health')} className="w-full text-gray-500 py-2">← Back</button>
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
            <button onClick={() => setStep('health')} className="w-full text-gray-500 py-2">← Back</button>
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
            <p className="text-gray-600">Share your Family Handle with everyone:</p>
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-300 rounded-3xl p-5 space-y-4 text-left shadow-sm">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-bold text-amber-700 uppercase tracking-wider">
                    FAMILY USERNAME (@HANDLE)
                  </p>
                  <button
                    onClick={() => {
                      if (typeof navigator !== 'undefined' && navigator.clipboard) {
                        navigator.clipboard.writeText(`@${shownUsername || familyId}`);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }
                    }}
                    className="text-xs font-bold text-amber-900 bg-amber-200/80 hover:bg-amber-300 px-2.5 py-1 rounded-lg transition active:scale-95"
                  >
                    {copied ? '✓ Copied!' : '📋 Copy Handle'}
                  </button>
                </div>
                <p className="text-2xl font-black text-amber-950 tracking-tight break-all select-all">
                  @{shownUsername || familyId}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">Family members log in using this Instagram-style handle</p>
              </div>

              <div className="pt-3 border-t border-amber-200/60">
                <p className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-1">
                  6-DIGIT PASSCODE
                </p>
                <p className="text-4xl font-mono font-black tracking-widest text-amber-700 select-all">
                  {shownPasscode}
                </p>
              </div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-sm text-blue-700 text-left">
              <p className="font-semibold mb-1">📱 WhatsApp Setup</p>
              <p>Send <strong>"join &lt;sandbox-code&gt;"</strong> to <strong>+1 415 523 8886</strong> on WhatsApp to receive medication alerts.</p>
            </div>
            <button
              onClick={() => router.replace('/care')}
              className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold text-xl rounded-2xl py-4 shadow-lg shadow-amber-500/20"
            >
              Go to Dashboard 🏠
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

