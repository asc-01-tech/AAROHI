// components/MedicalRecordsView.tsx
// Comprehensive Medical Profile, Past Medication History & Documents Vault.
'use client';

import React, { useState, useEffect } from 'react';
import {
  FileText,
  Heart,
  AlertTriangle,
  User,
  Phone,
  Mail,
  Calendar,
  CheckCircle2,
  Clock,
  Plus,
  ShieldAlert,
  Activity,
  Stethoscope,
  Pill,
} from 'lucide-react';
import type { Locale } from '@/lib/i18n';
import { getTranslations } from '@/lib/translations';

interface MedicalRecordsViewProps {
  locale: Locale;
  isCaretaker?: boolean;
}

export default function MedicalRecordsView({ locale, isCaretaker = false }: MedicalRecordsViewProps) {
  const [activeTab, setActiveTab] = useState<'profile' | 'history' | 'documents'>('profile');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [showAddDoc, setShowAddDoc] = useState(false);
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocCategory, setNewDocCategory] = useState('prescription');
  const [newDocDoctor, setNewDocDoctor] = useState('');
  const [newDocFacility, setNewDocFacility] = useState('');
  const [newDocSummary, setNewDocSummary] = useState('');
  const [savingDoc, setSavingDoc] = useState(false);

  const t = getTranslations(locale);

  const fetchRecords = async () => {
    try {
      const res = await fetch('/api/records');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.warn('Failed to fetch records:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const handleCreateDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocTitle.trim()) return;
    setSavingDoc(true);

    try {
      const res = await fetch('/api/records/document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newDocTitle.trim(),
          category: newDocCategory,
          doctor: newDocDoctor.trim() || 'Consulting Physician',
          facility: newDocFacility.trim() || 'Clinic / Hospital',
          summary: newDocSummary.trim(),
          date: new Date().toISOString().split('T')[0],
        }),
      });

      if (res.ok) {
        setShowAddDoc(false);
        setNewDocTitle('');
        setNewDocDoctor('');
        setNewDocFacility('');
        setNewDocSummary('');
        await fetchRecords();
      }
    } catch (err) {
      console.warn('Error creating document:', err);
    } finally {
      setSavingDoc(false);
    }
  };

  if (loading) {
    return (
      <div className="py-12 flex flex-col items-center justify-center space-y-3">
        <div className="text-4xl animate-bounce">📋</div>
        <p className="text-gray-500 font-semibold text-sm">Loading health records…</p>
      </div>
    );
  }

  const profile = data?.medicalProfile || {};
  const documents = data?.documents || [];
  const doseHistory = data?.doseHistory || [];
  const pastCourses = data?.pastCourses || [];

  return (
    <div className="space-y-4">
      {/* Tab Navigation */}
      <div className="flex bg-amber-100/70 p-1 rounded-2xl gap-1">
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex-1 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition flex items-center justify-center gap-1.5 ${
            activeTab === 'profile'
              ? 'bg-white text-amber-900 shadow-sm'
              : 'text-amber-800/80 hover:text-amber-900'
          }`}
        >
          <User className="w-4 h-4" />
          {t.tabProfile}
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition flex items-center justify-center gap-1.5 ${
            activeTab === 'history'
              ? 'bg-white text-amber-900 shadow-sm'
              : 'text-amber-800/80 hover:text-amber-900'
          }`}
        >
          <Clock className="w-4 h-4" />
          {t.tabMedsHistory}
        </button>
        <button
          onClick={() => setActiveTab('documents')}
          className={`flex-1 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition flex items-center justify-center gap-1.5 ${
            activeTab === 'documents'
              ? 'bg-white text-amber-900 shadow-sm'
              : 'text-amber-800/80 hover:text-amber-900'
          }`}
        >
          <FileText className="w-4 h-4" />
          {t.tabDocuments}
        </button>
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* TAB 1: MEDICAL PROFILE */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {activeTab === 'profile' && (
        <div className="space-y-4">
          {/* Patient Overview Card */}
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-amber-100 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-amber-100 rounded-2xl flex items-center justify-center text-2xl">
                👴
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">{profile.patientName}</h3>
                <p className="text-xs font-semibold text-gray-500">
                  {profile.age} yrs • {profile.gender} • {profile.nickname ? `"${profile.nickname}"` : ''}
                </p>
              </div>
            </div>
            {/* Blood Group Badge */}
            <div className="bg-red-50 border-2 border-red-200 rounded-2xl px-3.5 py-2 text-center">
              <p className="text-[10px] font-black uppercase tracking-wider text-red-600">{t.bloodGroup}</p>
              <p className="text-xl font-black text-red-700">{profile.bloodGroup || 'O+'}</p>
            </div>
          </div>

          {/* Vitals Snapshot */}
          {profile.recentVitals && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-3xl p-4">
              <div className="flex items-center gap-2 mb-3 text-blue-900 font-bold text-sm">
                <Activity className="w-4 h-4 text-blue-600" />
                <span>{t.recentVitals}</span>
                <span className="text-[11px] font-normal text-blue-600 ml-auto">{profile.recentVitals.lastChecked}</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                <div className="bg-white/80 p-2.5 rounded-2xl border border-blue-100">
                  <p className="text-[11px] text-gray-500 font-semibold">Blood Pressure</p>
                  <p className="text-base font-black text-gray-800">{profile.recentVitals.bloodPressure}</p>
                </div>
                <div className="bg-white/80 p-2.5 rounded-2xl border border-blue-100">
                  <p className="text-[11px] text-gray-500 font-semibold">Fasting Sugar</p>
                  <p className="text-base font-black text-gray-800">{profile.recentVitals.fastingBloodSugar}</p>
                </div>
                <div className="bg-white/80 p-2.5 rounded-2xl border border-blue-100">
                  <p className="text-[11px] text-gray-500 font-semibold">Heart Rate</p>
                  <p className="text-base font-black text-gray-800">{profile.recentVitals.heartRate}</p>
                </div>
                <div className="bg-white/80 p-2.5 rounded-2xl border border-blue-100">
                  <p className="text-[11px] text-gray-500 font-semibold">Oxygen (SpO2)</p>
                  <p className="text-base font-black text-emerald-700">{profile.recentVitals.spO2}</p>
                </div>
              </div>
            </div>
          )}

          {/* Allergies Card */}
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-red-100">
            <div className="flex items-center gap-2 mb-2 text-red-800 font-bold text-sm">
              <ShieldAlert className="w-4 h-4 text-red-600" />
              <span>{t.allergies}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {profile.allergies && profile.allergies.length > 0 ? (
                profile.allergies.map((allergy: string, idx: number) => (
                  <span
                    key={idx}
                    className="bg-red-50 text-red-700 border border-red-200 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5"
                  >
                    <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                    {allergy}
                  </span>
                ))
              ) : (
                <p className="text-xs text-gray-500">No known drug allergies reported.</p>
              )}
            </div>
          </div>

          {/* Chronic Conditions Card */}
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-amber-100">
            <div className="flex items-center gap-2 mb-2 text-amber-900 font-bold text-sm">
              <Heart className="w-4 h-4 text-amber-600" />
              <span>{t.conditions}</span>
            </div>
            <div className="space-y-1.5">
              {profile.conditions && profile.conditions.length > 0 ? (
                profile.conditions.map((cond: string, idx: number) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 bg-amber-50/70 text-gray-800 px-3 py-2 rounded-xl text-xs font-semibold"
                  >
                    <div className="w-2 h-2 rounded-full bg-amber-500" />
                    <span>{cond}</span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-gray-500">No chronic conditions listed.</p>
              )}
            </div>
          </div>

          {/* Primary Doctor & Emergency Contacts Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Primary Doctor */}
            {profile.primaryDoctor && (
              <div className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100 space-y-2">
                <div className="flex items-center gap-2 text-teal-800 font-bold text-xs uppercase tracking-wider">
                  <Stethoscope className="w-4 h-4 text-teal-600" />
                  <span>{t.doctor}</span>
                </div>
                <h4 className="text-sm font-bold text-gray-900">{profile.primaryDoctor.name}</h4>
                <p className="text-xs text-gray-500">{profile.primaryDoctor.specialty}</p>
                <p className="text-xs text-gray-400">{profile.primaryDoctor.clinic}</p>
                {profile.primaryDoctor.phone && (
                  <a
                    href={`tel:${profile.primaryDoctor.phone}`}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 px-3 py-1.5 rounded-xl transition"
                  >
                    <Phone className="w-3.5 h-3.5" /> Call Doctor
                  </a>
                )}
              </div>
            )}

            {/* Emergency Contact */}
            {profile.emergencyContact && (
              <div className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100 space-y-2">
                <div className="flex items-center gap-2 text-rose-800 font-bold text-xs uppercase tracking-wider">
                  <ShieldAlert className="w-4 h-4 text-rose-600" />
                  <span>{t.emergencyContact}</span>
                </div>
                <h4 className="text-sm font-bold text-gray-900">{profile.emergencyContact.name}</h4>
                <p className="text-xs text-gray-500">{profile.emergencyContact.relationship}</p>
                {profile.emergencyContact.phone && (
                  <a
                    href={`tel:${profile.emergencyContact.phone}`}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-xl transition"
                  >
                    <Phone className="w-3.5 h-3.5" /> Call Caretaker
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* TAB 2: PAST MEDICATION HISTORY */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          {/* Past Discontinued / Completed Courses */}
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-amber-100 space-y-3">
            <h4 className="text-sm font-bold text-gray-800 flex items-center gap-2">
              <Pill className="w-4 h-4 text-amber-600" />
              Completed & Past Prescription Courses
            </h4>
            <div className="space-y-2">
              {pastCourses.map((course: any) => (
                <div
                  key={course.id}
                  className="p-3 bg-gray-50 hover:bg-amber-50/50 rounded-2xl border border-gray-100 transition space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-gray-800">{course.medName}</span>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      {course.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600">{course.duration} • {course.reason}</p>
                  <p className="text-[11px] text-gray-400">Prescribed by {course.prescribedBy}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Historical Taken Doses Log */}
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-amber-100 space-y-3">
            <h4 className="text-sm font-bold text-gray-800 flex items-center gap-2">
              <Clock className="w-4 h-4 text-teal-600" />
              Past Dose Administration Log
            </h4>
            {doseHistory.length > 0 ? (
              <div className="space-y-2">
                {doseHistory.map((item: any) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl border border-gray-100 text-xs"
                  >
                    <div className="space-y-0.5">
                      <p className="font-bold text-gray-800 text-sm">{item.medName}</p>
                      <p className="text-gray-500">
                        {item.scheduledDate} at {item.scheduledTime}
                      </p>
                    </div>
                    <div>
                      {item.status === 'taken' ? (
                        <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 font-bold px-2.5 py-1 rounded-xl">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Taken
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-rose-100 text-rose-800 font-bold px-2.5 py-1 rounded-xl">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-600" /> Missed
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-gray-400 text-xs">
                No past doses recorded yet for this family. Daily records will appear here automatically.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* TAB 3: MEDICAL DOCUMENTS VAULT */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {activeTab === 'documents' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-gray-800">Prescriptions & Medical Records</h4>
            <button
              onClick={() => setShowAddDoc(!showAddDoc)}
              className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded-xl transition"
            >
              <Plus className="w-3.5 h-3.5" /> Add Document
            </button>
          </div>

          {/* New Document Form */}
          {showAddDoc && (
            <form onSubmit={handleCreateDocument} className="bg-white rounded-3xl p-5 shadow-md border border-amber-200 space-y-3">
              <h5 className="text-sm font-bold text-amber-900">Upload / Save New Medical Document</h5>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Document Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Patel Cardiology Prescription"
                  value={newDocTitle}
                  onChange={(e) => setNewDocTitle(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-400"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Category</label>
                  <select
                    value={newDocCategory}
                    onChange={(e) => setNewDocCategory(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-400"
                  >
                    <option value="prescription">Prescription</option>
                    <option value="lab_report">Lab Report</option>
                    <option value="scan">Scan / X-Ray</option>
                    <option value="discharge_summary">Discharge Summary</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Doctor / Clinic</label>
                  <input
                    type="text"
                    placeholder="e.g. Lilavati Hospital"
                    value={newDocFacility}
                    onChange={(e) => setNewDocFacility(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Doctor Instructions / Notes</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Continue Metformin 500mg after breakfast. Walk 30 min daily."
                  value={newDocSummary}
                  onChange={(e) => setNewDocSummary(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-400"
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAddDoc(false)}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-gray-500 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingDoc}
                  className="px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 shadow-sm"
                >
                  {savingDoc ? 'Saving…' : 'Save Document'}
                </button>
              </div>
            </form>
          )}

          {/* Document Cards */}
          <div className="space-y-3">
            {documents.map((doc: any) => (
              <div
                key={doc.id}
                className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 hover:border-amber-200 transition space-y-2.5"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                      {doc.category === 'prescription' ? '💊' : doc.category === 'lab_report' ? '🧪' : '🩻'}
                    </div>
                    <div>
                      <h5 className="font-bold text-sm text-gray-900">{doc.title}</h5>
                      <p className="text-xs text-gray-500">{doc.doctor} • {doc.facility}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 bg-gray-100 px-2 py-1 rounded-lg">
                    {doc.date}
                  </span>
                </div>

                {doc.summary && (
                  <p className="text-xs text-gray-600 bg-amber-50/50 p-2.5 rounded-2xl border border-amber-100/60 leading-relaxed">
                    {doc.summary}
                  </p>
                )}

                {doc.prescribedMeds && doc.prescribedMeds.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {doc.prescribedMeds.map((med: string, i: number) => (
                      <span
                        key={i}
                        className="bg-teal-50 text-teal-800 border border-teal-100 px-2.5 py-1 rounded-xl text-[11px] font-bold"
                      >
                        {med}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
