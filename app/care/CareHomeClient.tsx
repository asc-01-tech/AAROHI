// app/care/CareHomeClient.tsx
// 5-Tab Caretaker & Family Dashboard
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Heart,
  Calendar,
  Pill,
  Clock,
  Settings,
  Plus,
  Trash2,
  Edit2,
  LogOut,
  Send,
  AlertTriangle,
  CheckCircle,
  FileText,
  User,
  Phone,
  Globe,
  ClipboardList,
  Copy,
  Check,
  Lock,
  Key,
  AtSign,
} from 'lucide-react';
import { useCareData, DoseEvent, Medication, Appointment } from '@/components/CareDataProvider';
import AdherenceRing from '@/components/AdherenceRing';
import StreakBar from '@/components/StreakBar';
import MedFormModal, { MedFormValues } from '@/components/MedFormModal';
import { DashboardSkeleton } from '@/components/Skeletons/DashboardSkeleton';
import LogoutModal from '@/components/LogoutModal';
import LanguageModal from '@/components/LanguageModal';
import MedicalRecordsView from '@/components/MedicalRecordsView';
import { type Locale, LOCALE_NAMES } from '@/lib/i18n';

interface CareHomeClientProps {
  familyId: string;
  initialUsername?: string;
  memberId: string;
  role: 'elder' | 'caretaker' | 'family';
  elderName: string;
  elderNickname: string;
  locale: Locale;
  streak: number;
  bestStreak: number;
  plantLevel: number;
  caretakerPhone: string;
}

type TabType = 'overview' | 'meds' | 'records' | 'appointments' | 'activity' | 'settings';

export default function CareHomeClient({
  familyId,
  initialUsername = '',
  memberId,
  role,
  elderName,
  elderNickname,
  locale,
  streak,
  bestStreak,
  plantLevel,
  caretakerPhone,
}: CareHomeClientProps) {
  const router = useRouter();
  const { doses, meds, appointments, changeRequests, loading } = useCareData();
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  // Username & Handle state
  const [currentUsername, setCurrentUsername] = useState(initialUsername);
  const displayHandle = currentUsername ? `@${currentUsername}` : familyId;

  // Change Username Modal State
  const [usernameModalOpen, setUsernameModalOpen] = useState(false);
  const [newUsernameInput, setNewUsernameInput] = useState(initialUsername);
  const [usernameSaving, setUsernameSaving] = useState(false);
  const [usernameError, setUsernameError] = useState('');
  const [usernameSuccess, setUsernameSuccess] = useState('');

  // Change Passcode Modal State
  const [passcodeModalOpen, setPasscodeModalOpen] = useState(false);
  const [currentPasscodeInput, setCurrentPasscodeInput] = useState('');
  const [newPasscodeInput, setNewPasscodeInput] = useState('');
  const [confirmPasscodeInput, setConfirmPasscodeInput] = useState('');
  const [passcodeSaving, setPasscodeSaving] = useState(false);
  const [passcodeError, setPasscodeError] = useState('');
  const [passcodeSuccess, setPasscodeSuccess] = useState('');

  const handleChangeUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newUsernameInput.trim().toLowerCase().replace(/^@/, '');
    if (clean.length < 3) {
      setUsernameError('Username must be at least 3 characters');
      return;
    }
    setUsernameSaving(true);
    setUsernameError('');
    setUsernameSuccess('');
    try {
      const res = await fetch('/api/family/update-username', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: clean }),
      });
      const data = await res.json();
      if (!res.ok) {
        setUsernameError(data.error || 'Failed to update username');
        return;
      }
      setCurrentUsername(data.username);
      setUsernameSuccess(`Username updated to @${data.username}!`);
      setTimeout(() => {
        setUsernameModalOpen(false);
        setUsernameSuccess('');
      }, 1200);
    } catch {
      setUsernameError('Network error. Please try again.');
    } finally {
      setUsernameSaving(false);
    }
  };

  const handleChangePasscode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPasscodeInput.length !== 6) {
      setPasscodeError('New passcode must be exactly 6 numeric digits');
      return;
    }
    if (newPasscodeInput !== confirmPasscodeInput) {
      setPasscodeError('New passcodes do not match');
      return;
    }
    setPasscodeSaving(true);
    setPasscodeError('');
    setPasscodeSuccess('');
    try {
      const res = await fetch('/api/family/update-passcode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPasscode: currentPasscodeInput,
          newPasscode: newPasscodeInput,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPasscodeError(data.error || 'Failed to update passcode');
        return;
      }
      setPasscodeSuccess('Passcode successfully changed!');
      setCurrentPasscodeInput('');
      setNewPasscodeInput('');
      setConfirmPasscodeInput('');
      setTimeout(() => {
        setPasscodeModalOpen(false);
        setPasscodeSuccess('');
      }, 1200);
    } catch {
      setPasscodeError('Network error. Please try again.');
    } finally {
      setPasscodeSaving(false);
    }
  };

  // Medication modal state
  const [medModalOpen, setMedModalOpen] = useState(false);
  const [selectedMed, setSelectedMed] = useState<Medication | null>(null);

  // Appointment form state (inline)
  const [showApptForm, setShowApptForm] = useState(false);
  const [apptDoctor, setApptDoctor] = useState('');
  const [apptSpecialty, setApptSpecialty] = useState('');
  const [apptDateTime, setApptDateTime] = useState('');
  const [apptLocation, setApptLocation] = useState('');
  const [apptNotes, setApptNotes] = useState('');
  const [apptSubmitting, setApptSubmitting] = useState(false);

  // Hug Modal state
  const [hugModalOpen, setHugModalOpen] = useState(false);
  const [selectedEmoji, setSelectedEmoji] = useState('❤️');
  const [hugSending, setHugSending] = useState(false);

  // Logout modal state
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);

  // User-scoped language preference
  const [userLocale, setUserLocale] = useState<Locale>(locale);
  const [langModalOpen, setLangModalOpen] = useState(false);

  React.useEffect(() => {
    try {
      const stored = localStorage.getItem('carecircle_user_locale') as Locale | null;
      if (stored && (stored === 'mr-IN' || stored === 'hi-IN' || stored === 'en-IN')) {
        setUserLocale(stored);
      }
    } catch { }
  }, []);

  const handleSelectLocale = (newLocale: Locale) => {
    setUserLocale(newLocale);
    try {
      localStorage.setItem('carecircle_user_locale', newLocale);
    } catch { }
  };

  // Family ID copy state
  const [copiedFamilyId, setCopiedFamilyId] = useState(false);

  const handleCopyFamilyId = () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        navigator.clipboard.writeText(displayHandle);
        setCopiedFamilyId(true);
        setTimeout(() => setCopiedFamilyId(false), 2500);
      }
    } catch { }
  };

  // Notification test status
  const [testStatus, setTestStatus] = useState<string | null>(null);

  // Adherence calculation
  const totalDoses = doses.length;
  const takenDoses = doses.filter((d) => d.status === 'taken').length;
  const missedDoses = doses.filter((d) => d.status === 'missed').length;

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    } catch {
      router.push('/login');
    }
  };

  const handleSaveMed = async (values: MedFormValues) => {
    if (selectedMed?.id) {
      if (role === 'family') {
        // Family request change
        await fetch('/api/change-requests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            medId: selectedMed.id,
            medName: values.name,
            type: 'edit',
            payload: values,
            requestedBy: role,
          }),
        });
        alert('Change request sent to ' + elderNickname + ' for approval!');
      } else {
        await fetch(`/api/meds/${selectedMed.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(values),
        });
      }
    } else {
      await fetch('/api/meds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
    }
    setMedModalOpen(false);
    setSelectedMed(null);
  };

  const handleDeleteMed = async (med: Medication) => {
    if (!confirm(`Are you sure you want to remove ${med.name}?`)) return;

    if (role === 'family') {
      await fetch('/api/change-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          medId: med.id,
          medName: med.name,
          type: 'delete',
          payload: { active: false },
          requestedBy: role,
        }),
      });
      alert('Delete request sent to ' + elderNickname + ' for approval!');
    } else {
      await fetch(`/api/meds/${med.id}`, { method: 'DELETE' });
    }
  };

  const handleAddAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apptDoctor || !apptDateTime) return;

    try {
      setApptSubmitting(true);
      await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doctorName: apptDoctor,
          specialty: apptSpecialty,
          dateTime: apptDateTime,
          location: apptLocation,
          notes: apptNotes,
          reminder: true,
        }),
      });
      setShowApptForm(false);
      setApptDoctor('');
      setApptSpecialty('');
      setApptDateTime('');
      setApptLocation('');
      setApptNotes('');
    } finally {
      setApptSubmitting(false);
    }
  };

  const handleDeleteAppointment = async (id: string) => {
    if (!confirm('Cancel this appointment?')) return;
    await fetch(`/api/appointments/${id}`, { method: 'DELETE' });
  };

  const handleSendHug = async () => {
    try {
      setHugSending(true);
      await fetch('/api/hugs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emoji: selectedEmoji,
          fromName: role === 'caretaker' ? 'Caretaker' : 'Family',
        }),
      });
      setHugModalOpen(false);
    } finally {
      setHugSending(false);
    }
  };

  const handleTestNotification = async () => {
    try {
      setTestStatus('Sending test alerts...');
      const res = await fetch(`/api/meds/test/notify-test`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setTestStatus(`Sent! WhatsApp: ${data.whatsapp ? '✅' : '❌'}, Email: ${data.email ? '✅' : '❌'}`);
      } else {
        setTestStatus(`Failed: ${data.error || 'Check environment keys'}`);
      }
    } catch (e: unknown) {
      setTestStatus('Error sending test notification');
    }
  };

  if (loading) {
    return (
      <div className="max-w-md mx-auto p-4 min-h-screen bg-gray-50 pb-24">
        <DashboardSkeleton />
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto min-h-screen bg-gray-50 flex flex-col pb-24">
      {/* Top Header */}
      <header className="bg-white px-5 py-3.5 border-b border-gray-100 sticky top-0 z-20">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black text-amber-600 flex items-center gap-1.5">
              <span>Aarohi</span>
              <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold capitalize">
                {role}
              </span>
            </h1>
            <p className="text-xs text-gray-500 font-medium">Caring for {elderNickname}</p>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-100 transition"
            title="Logout"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>

        {/* Visible Family Handle in Top Bar */}
        <div className="mt-2.5 flex items-center justify-between bg-amber-50/90 border border-amber-200/90 rounded-xl px-3 py-1.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider shrink-0">Family:</span>
            <span className="text-xs font-bold text-amber-950 truncate select-all">{displayHandle}</span>
          </div>
          <button
            onClick={handleCopyFamilyId}
            className="ml-2 shrink-0 flex items-center gap-1 text-[11px] font-bold bg-amber-200/80 hover:bg-amber-300 text-amber-900 px-2 py-0.5 rounded-lg transition active:scale-95"
            title="Copy Family Handle"
            aria-label="Copy Family Handle"
          >
            {copiedFamilyId ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Copy className="w-3.5 h-3.5 text-amber-800" />}
            <span>{copiedFamilyId ? 'Copied!' : 'Copy'}</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="p-4 flex-1 space-y-4">
        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {/* Family Circle Handle Banner */}
            <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-orange-500 rounded-3xl p-4 text-white shadow-md shadow-amber-500/15">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-wider font-bold text-amber-100 flex items-center gap-1.5">
                    <span>✨</span> Family Circle Handle
                  </p>
                  <p className="text-xl font-black tracking-tight text-white mt-0.5 select-all">{displayHandle}</p>
                </div>
                <button
                  onClick={handleCopyFamilyId}
                  className="bg-white/20 hover:bg-white/30 active:scale-95 text-white font-bold text-xs px-3.5 py-2 rounded-xl backdrop-blur-sm transition flex items-center gap-1.5 border border-white/25 shadow-xs"
                >
                  {copiedFamilyId ? <Check className="w-4 h-4 text-emerald-200" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedFamilyId ? 'Copied!' : 'Copy Handle'}</span>
                </button>
              </div>
              <p className="text-xs text-amber-100 mt-2 leading-relaxed">
                Share your handle <strong>{displayHandle}</strong> and your 6-digit passcode with your family & elder to log in on their phones.
              </p>
            </div>

            {/* Adherence & Streak Card */}
            <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 flex items-center justify-between">
              <AdherenceRing taken={takenDoses} total={totalDoses} size={110} />
              <div className="flex-1 pl-4">
                <StreakBar streak={streak} bestStreak={bestStreak} plantLevel={plantLevel} />
              </div>
            </div>

            {/* Missed Doses Alert Banner */}
            {missedDoses > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3">
                <AlertTriangle className="w-6 h-6 text-red-500 shrink-0" />
                <div className="flex-1 text-sm">
                  <p className="font-bold text-red-800">
                    {missedDoses} dose{missedDoses > 1 ? 's' : ''} missed today
                  </p>
                  <p className="text-red-600 text-xs">
                    Automated escalation notifications have been triggered.
                  </p>
                </div>
              </div>
            )}

            {/* Cheer-Back / Send Hug Button */}
            <button
              onClick={() => setHugModalOpen(true)}
              className="w-full bg-gradient-to-r from-rose-500 to-pink-500 text-white font-bold py-3.5 px-4 rounded-2xl shadow-lg shadow-rose-500/20 flex items-center justify-center gap-2 hover:opacity-95 transition"
            >
              <Heart className="w-5 h-5 fill-white" />
              <span>Send a Hug to {elderNickname}</span>
            </button>

            {/* Today's Dose Feed */}
            <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100">
              <h2 className="font-bold text-gray-900 mb-3 flex items-center gap-2 text-base">
                <Clock className="w-4 h-4 text-amber-500" />
                <span>Today&apos;s Medication Schedule</span>
              </h2>

              {doses.length === 0 ? (
                <p className="text-sm text-gray-400 py-4 text-center">
                  No medications scheduled for today.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {doses.map((dose) => {
                    const timeStr = dose.scheduledAt?.toDate
                      ? dose.scheduledAt.toDate().toLocaleTimeString('en-IN', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true,
                      })
                      : 'Scheduled';

                    const isTaken = dose.status === 'taken';
                    const isMissed = dose.status === 'missed';

                    return (
                      <div
                        key={dose.id}
                        className={`p-3.5 rounded-2xl border flex items-center justify-between ${isTaken
                          ? 'bg-emerald-50/50 border-emerald-200 text-emerald-950'
                          : isMissed
                            ? 'bg-red-50/50 border-red-200 text-red-950'
                            : 'bg-gray-50 border-gray-100 text-gray-900'
                          }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">
                            {dose.form === 'capsule' ? '💊' : dose.form === 'syrup' ? '🧴' : '💊'}
                          </span>
                          <div>
                            <p className="font-bold text-sm leading-tight">{dose.medName}</p>
                            <p className="text-xs text-gray-500">{timeStr}</p>
                          </div>
                        </div>

                        <div>
                          {isTaken && (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full">
                              <CheckCircle className="w-3.5 h-3.5" /> Taken
                            </span>
                          )}
                          {isMissed && (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-red-700 bg-red-100 px-2.5 py-1 rounded-full">
                              <AlertTriangle className="w-3.5 h-3.5" /> Missed
                            </span>
                          )}
                          {!isTaken && !isMissed && (
                            <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-full">
                              Pending
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: MEDS */}
        {activeTab === 'meds' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-lg text-gray-900">Active Prescriptions</h2>
              <button
                onClick={() => {
                  setSelectedMed(null);
                  setMedModalOpen(true);
                }}
                className="bg-amber-500 hover:bg-amber-600 text-white font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20"
              >
                <Plus className="w-4 h-4" /> Add Medicine
              </button>
            </div>

            {changeRequests.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 text-xs text-amber-800">
                <span className="font-bold">Pending Approval:</span> {changeRequests.length} change
                request(s) awaiting {elderNickname}&apos;s review.
              </div>
            )}

            <div className="space-y-3">
              {meds.map((med) => (
                <div
                  key={med.id}
                  className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900 text-base">{med.name}</span>
                        {med.strength && (
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md font-semibold">
                            {med.strength}
                          </span>
                        )}
                        {med.criticality === 'critical' && (
                          <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-md font-bold">
                            Critical
                          </span>
                        )}
                      </div>
                      {med.purpose && (
                        <p className="text-xs text-gray-500 mt-0.5">{med.purpose}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setSelectedMed(med);
                          setMedModalOpen(true);
                        }}
                        className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteMed(med)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 text-xs text-gray-600 pt-2 border-t border-gray-50">
                    <span className="bg-gray-50 px-2 py-1 rounded-md">
                      🕒 {med.times?.join(', ') || 'None'}
                    </span>
                    <span className="bg-gray-50 px-2 py-1 rounded-md">
                      💊 {med.pillCount ?? 0} pills remaining
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: MEDICAL RECORDS & PROFILE */}
        {activeTab === 'records' && (
          <div className="space-y-4">
            <h2 className="font-bold text-lg text-gray-900">Health Profile & Medical Vault</h2>
            <MedicalRecordsView locale={userLocale} isCaretaker={true} />
          </div>
        )}

        {/* TAB 4: APPOINTMENTS */}
        {activeTab === 'appointments' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-lg text-gray-900">Doctor Visits</h2>
              <button
                onClick={() => setShowApptForm(!showApptForm)}
                className="bg-amber-500 hover:bg-amber-600 text-white font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20"
              >
                <Plus className="w-4 h-4" /> {showApptForm ? 'Close' : 'Add Visit'}
              </button>
            </div>

            {/* Inline Add Appointment Form */}
            {showApptForm && (
              <form
                onSubmit={handleAddAppointment}
                className="bg-white p-4 rounded-2xl border border-amber-200 shadow-sm space-y-3"
              >
                <h3 className="text-sm font-bold text-gray-800">New Appointment</h3>
                <input
                  type="text"
                  placeholder="Doctor Name (e.g. Dr. Verma) *"
                  value={apptDoctor}
                  onChange={(e) => setApptDoctor(e.target.value)}
                  className="w-full px-3 py-2 text-sm border rounded-xl outline-none focus:ring-2 focus:ring-amber-500"
                  required
                />
                <input
                  type="text"
                  placeholder="Specialty (e.g. Cardiologist)"
                  value={apptSpecialty}
                  onChange={(e) => setApptSpecialty(e.target.value)}
                  className="w-full px-3 py-2 text-sm border rounded-xl outline-none focus:ring-2 focus:ring-amber-500"
                />
                <input
                  type="datetime-local"
                  value={apptDateTime}
                  onChange={(e) => setApptDateTime(e.target.value)}
                  className="w-full px-3 py-2 text-sm border rounded-xl outline-none focus:ring-2 focus:ring-amber-500"
                  required
                />
                <input
                  type="text"
                  placeholder="Hospital / Clinic Location"
                  value={apptLocation}
                  onChange={(e) => setApptLocation(e.target.value)}
                  className="w-full px-3 py-2 text-sm border rounded-xl outline-none focus:ring-2 focus:ring-amber-500"
                />
                <textarea
                  rows={2}
                  placeholder="Notes (bring reports, fasting, etc.)"
                  value={apptNotes}
                  onChange={(e) => setApptNotes(e.target.value)}
                  className="w-full px-3 py-2 text-sm border rounded-xl outline-none focus:ring-2 focus:ring-amber-500"
                />
                <button
                  type="submit"
                  disabled={apptSubmitting}
                  className="w-full bg-amber-500 text-white font-bold py-2.5 rounded-xl text-sm"
                >
                  {apptSubmitting ? 'Saving...' : 'Save Appointment'}
                </button>
              </form>
            )}

            <div className="space-y-3">
              {appointments.length === 0 ? (
                <p className="text-sm text-gray-400 py-6 text-center">
                  No upcoming appointments.
                </p>
              ) : (
                appointments.map((appt) => {
                  const dateStr = appt.dateTime?.toDate
                    ? appt.dateTime.toDate().toLocaleString('en-IN', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })
                    : 'Scheduled';

                  return (
                    <div
                      key={appt.id}
                      className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-start justify-between"
                    >
                      <div className="space-y-1">
                        <p className="font-bold text-gray-900 text-sm">
                          {appt.doctorName}{' '}
                          {appt.specialty && (
                            <span className="text-xs text-gray-500 font-normal">
                              ({appt.specialty})
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-amber-600 font-medium">📅 {dateStr}</p>
                        {appt.location && (
                          <p className="text-xs text-gray-500">📍 {appt.location}</p>
                        )}
                        {appt.notes && (
                          <p className="text-xs text-gray-400 italic mt-1">{appt.notes}</p>
                        )}
                      </div>
                      <button
                        onClick={() => handleDeleteAppointment(appt.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* TAB 4: ACTIVITY */}
        {activeTab === 'activity' && (
          <div className="space-y-3">
            <h2 className="font-bold text-lg text-gray-900">Care Audit Log</h2>
            {doses.length === 0 ? (
              <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center space-y-2">
                <span className="text-4xl">📋</span>
                <p className="font-semibold text-gray-700">No activity yet</p>
                <p className="text-xs text-gray-400">
                  Medication logs, hugs, and appointment reminders will appear here once your family starts using Aarohi.
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm space-y-4">
                {doses.filter(d => d.status === 'taken' || d.status === 'missed').map((dose) => (
                  <div key={dose.id} className="flex items-start gap-3 text-sm">
                    <span className={`p-2 rounded-xl ${dose.status === 'taken' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
                      {dose.status === 'taken' ? '✅' : '⚠️'}
                    </span>
                    <div>
                      <p className="font-bold text-gray-900">
                        {elderNickname} {dose.status === 'taken' ? 'took' : 'missed'} {dose.medName}
                      </p>
                      <p className="text-xs text-gray-400">
                        {dose.scheduledAt?.toDate
                          ? dose.scheduledAt.toDate().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
                          : 'Recorded'}
                      </p>
                    </div>
                  </div>
                ))}
                {doses.filter(d => d.status === 'taken' || d.status === 'missed').length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-2">No completed doses recorded yet today.</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 5: SETTINGS */}
        {activeTab === 'settings' && (
          <div className="space-y-4">
            <h2 className="font-bold text-lg text-gray-900">Family & App Settings</h2>

            {/* Family Circle Handle Card */}
            <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-gray-700 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <AtSign className="w-4 h-4 text-amber-500" /> Family Username (@handle)
                </span>
                <span className="text-[10px] uppercase font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                  Instagram Style
                </span>
              </h3>
              <div className="space-y-2 text-gray-600">
                <div className="flex items-center justify-between bg-amber-50/80 border border-amber-200/80 rounded-2xl p-3">
                  <div className="min-w-0">
                    <span className="text-[11px] text-gray-400 block font-medium">Your Family Handle:</span>
                    <span className="text-base font-black text-amber-950 truncate block select-all">
                      {displayHandle}
                    </span>
                  </div>
                  <button
                    onClick={handleCopyFamilyId}
                    className="shrink-0 text-xs bg-amber-500 hover:bg-amber-600 text-white font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition active:scale-95 shadow-xs"
                    title="Copy Handle"
                  >
                    {copiedFamilyId ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedFamilyId ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <p className="text-xs text-gray-500">
                  All family members and elders can type this username to log in easily on any device.
                </p>
                <button
                  onClick={() => {
                    setNewUsernameInput(currentUsername || '');
                    setUsernameError('');
                    setUsernameSuccess('');
                    setUsernameModalOpen(true);
                  }}
                  className="w-full mt-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold py-2.5 px-3 rounded-xl transition flex items-center justify-center gap-2"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Change Family Username (@handle)</span>
                </button>
              </div>
            </div>

            {/* Login Passcode Card */}
            <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm space-y-3">
              <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-500" /> Security & 6-Digit Passcode
              </h3>
              <p className="text-xs text-gray-500">
                The 6-digit passcode is shared by all family members to access this circle.
              </p>
              <div className="flex items-center justify-between bg-gray-50 border border-gray-100 rounded-2xl p-3">
                <span className="text-sm font-mono tracking-widest text-gray-400 font-bold select-none">
                  ● ● ● ● ● ●
                </span>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg">
                  Active
                </span>
              </div>
              <button
                onClick={() => {
                  setCurrentPasscodeInput('');
                  setNewPasscodeInput('');
                  setConfirmPasscodeInput('');
                  setPasscodeError('');
                  setPasscodeSuccess('');
                  setPasscodeModalOpen(true);
                }}
                className="w-full bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold py-2.5 px-3 rounded-xl transition flex items-center justify-center gap-2"
              >
                <Key className="w-3.5 h-3.5" />
                <span>Change 6-Digit Passcode</span>
              </button>
            </div>

            <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm space-y-3">
              <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                <User className="w-4 h-4 text-amber-500" /> Elder Profile
              </h3>
              <div className="text-sm space-y-1.5 text-gray-600">
                <p>
                  <strong className="text-gray-900">Full Name:</strong> {elderName}
                </p>
                <p>
                  <strong className="text-gray-900">Nickname:</strong> {elderNickname}
                </p>
                <p>
                  <strong className="text-gray-900">Language:</strong> {locale}
                </p>
              </div>
            </div>

            {/* Language Switcher Card */}
            <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm space-y-3">
              <h3 className="text-sm font-bold text-gray-700 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-amber-500" /> Interface Language
                </span>
                <span className="text-xs bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-lg">
                  {LOCALE_NAMES[userLocale] || 'English'}
                </span>
              </h3>
              <p className="text-xs text-gray-500">
                Change your personal display language. Medicine names remain in English by default.
              </p>
              <button
                onClick={() => setLangModalOpen(true)}
                className="w-full bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold py-2.5 px-3 rounded-xl transition flex items-center justify-center gap-2"
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Change Language (मराठी / हिंदी / English)</span>
              </button>
            </div>

            <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm space-y-3">
              <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                <Phone className="w-4 h-4 text-emerald-500" /> Notification Channels
              </h3>
              <p className="text-xs text-gray-500">
                Reminders are automatically sent to WhatsApp ({caretakerPhone || '+91...'}) and registered email.
              </p>

              <button
                onClick={handleTestNotification}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold py-2.5 px-3 rounded-xl transition"
              >
                Send Test Alert (WhatsApp + Email)
              </button>

              {testStatus && (
                <p className="text-xs font-semibold text-amber-800 bg-amber-50 p-2 rounded-lg">
                  {testStatus}
                </p>
              )}
            </div>

            <button
              onClick={() => setLogoutModalOpen(true)}
              className="w-full py-3 bg-red-50 text-red-600 rounded-2xl font-bold text-sm hover:bg-red-100 transition flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              <span>Log Out of Aarohi</span>
            </button>
          </div>
        )}
      </main>

      {/* Hug Modal */}
      {hugModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 space-y-4 shadow-2xl">
            <h3 className="font-black text-gray-900 text-center text-lg">
              Send Love to {elderNickname} ❤️
            </h3>
            <p className="text-xs text-gray-500 text-center">
              Your cheer will pop up on their screen right away!
            </p>

            <div className="flex justify-around py-2">
              {['❤️', '🤗', '🌟', '💪', '🙏'].map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => setSelectedEmoji(emoji)}
                  className={`text-3xl p-2 rounded-2xl transition ${selectedEmoji === emoji ? 'bg-rose-100 scale-125' : 'hover:bg-gray-100'
                    }`}
                >
                  {emoji}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setHugModalOpen(false)}
                className="flex-1 py-2.5 border rounded-xl text-sm font-bold text-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={handleSendHug}
                disabled={hugSending}
                className="flex-1 py-2.5 bg-rose-500 text-white rounded-xl text-sm font-bold shadow-md shadow-rose-500/25"
              >
                {hugSending ? 'Sending...' : 'Send Cheer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Med Form Modal */}
      <MedFormModal
        open={medModalOpen}
        onClose={() => {
          setMedModalOpen(false);
          setSelectedMed(null);
        }}
        initialValues={selectedMed || undefined}
        onSave={handleSaveMed}
      />

      {/* Passcode Logout Modal */}
      <LogoutModal
        open={logoutModalOpen}
        onClose={() => setLogoutModalOpen(false)}
        familyId={familyId}
        title="Sign Out of Aarohi"
        description="Enter your 6-digit family passcode to confirm signing out."
      />

      {/* Language Selection Modal */}
      <LanguageModal
        open={langModalOpen}
        onClose={() => setLangModalOpen(false)}
        currentLocale={userLocale}
        onSelectLocale={handleSelectLocale}
      />

      {/* Change Username Modal */}
      {usernameModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleChangeUsername}
            className="bg-white w-full max-w-sm rounded-3xl p-6 space-y-4 shadow-2xl border border-amber-100"
          >
            <div className="text-center">
              <span className="text-3xl">✨</span>
              <h3 className="font-black text-gray-900 text-lg mt-1">Change Family Handle</h3>
              <p className="text-xs text-gray-500 mt-1">
                Choose an Instagram-style handle for your circle (e.g. @sharma_family)
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">New Handle</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-base font-bold text-amber-500 select-none">@</span>
                <input
                  type="text"
                  required
                  value={newUsernameInput}
                  onChange={(e) => {
                    setNewUsernameInput(e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ''));
                    setUsernameError('');
                  }}
                  placeholder="e.g. sharma_family"
                  className="w-full border-2 border-amber-200 rounded-2xl pl-8 pr-4 py-2.5 text-base font-bold text-gray-800 focus:outline-none focus:border-amber-400"
                />
              </div>
              <p className="text-[11px] text-gray-400 mt-1">Letters, numbers, underscores, or hyphens (3-30 chars)</p>
            </div>

            {usernameError && (
              <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
                {usernameError}
              </div>
            )}

            {usernameSuccess && (
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 font-bold">
                ✓ {usernameSuccess}
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setUsernameModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-100 border border-gray-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={usernameSaving || !newUsernameInput.trim()}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-amber-500 hover:bg-amber-600 disabled:opacity-50 shadow-sm"
              >
                {usernameSaving ? 'Saving…' : 'Save Handle'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Change Passcode Modal */}
      {passcodeModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleChangePasscode}
            className="bg-white w-full max-w-sm rounded-3xl p-6 space-y-4 shadow-2xl border border-amber-100"
          >
            <div className="text-center">
              <span className="text-3xl">🔐</span>
              <h3 className="font-black text-gray-900 text-lg mt-1">Change Family Passcode</h3>
              <p className="text-xs text-gray-500 mt-1">
                Enter your current 6-digit passcode and pick a new one
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Current 6-Digit Passcode</label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  required
                  value={currentPasscodeInput}
                  onChange={(e) => setCurrentPasscodeInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="● ● ● ● ● ●"
                  className="w-full border-2 border-gray-200 rounded-2xl px-4 py-2.5 text-center font-mono text-xl tracking-widest focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">New 6-Digit Passcode</label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  required
                  value={newPasscodeInput}
                  onChange={(e) => setNewPasscodeInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="New 6 digits"
                  className="w-full border-2 border-amber-200 rounded-2xl px-4 py-2.5 text-center font-mono text-xl tracking-widest focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Confirm New Passcode</label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  required
                  value={confirmPasscodeInput}
                  onChange={(e) => setConfirmPasscodeInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="Confirm 6 digits"
                  className="w-full border-2 border-amber-200 rounded-2xl px-4 py-2.5 text-center font-mono text-xl tracking-widest focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            {passcodeError && (
              <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
                {passcodeError}
              </div>
            )}

            {passcodeSuccess && (
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 font-bold">
                ✓ {passcodeSuccess}
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPasscodeModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-100 border border-gray-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={passcodeSaving || newPasscodeInput.length !== 6 || confirmPasscodeInput.length !== 6}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-amber-500 hover:bg-amber-600 disabled:opacity-50 shadow-sm"
              >
                {passcodeSaving ? 'Updating…' : 'Update Passcode'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-gray-100 px-3 py-2 flex justify-around items-center z-30 shadow-lg">
        {[
          { id: 'overview', label: 'Overview', icon: Heart },
          { id: 'meds', label: 'Meds', icon: Pill },
          { id: 'records', label: 'Records', icon: ClipboardList },
          { id: 'appointments', label: 'Visits', icon: Calendar },
          { id: 'activity', label: 'Activity', icon: FileText },
          { id: 'settings', label: 'Settings', icon: Settings },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex flex-col items-center py-1 px-2.5 rounded-xl transition ${isActive ? 'text-amber-600' : 'text-gray-400 hover:text-gray-600'
                }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-bold mt-0.5">{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
