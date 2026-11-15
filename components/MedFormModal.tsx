// components/MedFormModal.tsx
// Full-screen modal for adding/editing medications.
// Uses framer-motion `m` (domMax) with LazyMotion at root.
// Standard React state for form management (zero extra deps) with Zod validation.
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { z } from 'zod';
import { X, Plus, Trash2 } from 'lucide-react';

const MedSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  strength: z.string().max(50).default(''),
  form: z.enum(['capsule', 'tablet', 'syrup', 'injection']).default('tablet'),
  purpose: z.string().max(200).default(''),
  instructions: z.string().max(300).default(''),
  times: z.array(z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time (HH:MM)')).min(1, 'At least one time required'),
  daysOfWeek: z.array(z.number().min(0).max(6)).min(1, 'Select at least one day'),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  endDate: z.string().optional().default(''),
  criticality: z.enum(['low', 'normal', 'critical']).default('normal'),
  pillCount: z.number().int().min(0).default(30),
  refillThreshold: z.number().int().min(0).default(7),
});

export type MedFormValues = z.infer<typeof MedSchema>;

export interface Med {
  id?: string;
  name: string;
  strength?: string;
  form?: 'capsule' | 'tablet' | 'syrup' | 'injection';
  purpose?: string;
  instructions?: string;
  times?: string[];
  daysOfWeek?: number[];
  startDate?: string;
  endDate?: string;
  criticality?: 'low' | 'normal' | 'critical';
  pillCount?: number;
  refillThreshold?: number;
}

interface MedFormModalProps {
  open: boolean;
  onClose: () => void;
  initialValues?: Partial<Med>;
  onSave: (values: MedFormValues) => Promise<void> | void;
}

const DAYS = [
  { label: 'Su', value: 0 },
  { label: 'Mo', value: 1 },
  { label: 'Tu', value: 2 },
  { label: 'We', value: 3 },
  { label: 'Th', value: 4 },
  { label: 'Fr', value: 5 },
  { label: 'Sa', value: 6 },
];

export default function MedFormModal({
  open,
  onClose,
  initialValues,
  onSave,
}: MedFormModalProps) {
  const todayStr = new Date().toISOString().split('T')[0];

  const [name, setName] = useState('');
  const [strength, setStrength] = useState('');
  const [form, setForm] = useState<'capsule' | 'tablet' | 'syrup' | 'injection'>('tablet');
  const [purpose, setPurpose] = useState('');
  const [instructions, setInstructions] = useState('');
  const [times, setTimes] = useState<string[]>(['08:00']);
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState('');
  const [criticality, setCriticality] = useState<'low' | 'normal' | 'critical'>('normal');
  const [pillCount, setPillCount] = useState<number>(30);
  const [refillThreshold, setRefillThreshold] = useState<number>(7);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // Sync initialValues when modal opens or initialValues change
  useEffect(() => {
    if (open) {
      setName(initialValues?.name ?? '');
      setStrength(initialValues?.strength ?? '');
      setForm(initialValues?.form ?? 'tablet');
      setPurpose(initialValues?.purpose ?? '');
      setInstructions(initialValues?.instructions ?? '');
      setTimes(initialValues?.times && initialValues.times.length > 0 ? initialValues.times : ['08:00']);
      setDaysOfWeek(initialValues?.daysOfWeek ?? [0, 1, 2, 3, 4, 5, 6]);
      setStartDate(initialValues?.startDate ?? todayStr);
      setEndDate(initialValues?.endDate ?? '');
      setCriticality(initialValues?.criticality ?? 'normal');
      setPillCount(initialValues?.pillCount ?? 30);
      setRefillThreshold(initialValues?.refillThreshold ?? 7);
      setErrors({});
      setSubmitting(false);
    }
  }, [open, initialValues, todayStr]);

  // Close on Escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (open) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.classList.add('overflow-hidden');
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.classList.remove('overflow-hidden');
    };
  }, [open, handleKeyDown]);

  const toggleDay = (day: number) => {
    if (daysOfWeek.includes(day)) {
      if (daysOfWeek.length > 1) {
        setDaysOfWeek(daysOfWeek.filter((d) => d !== day));
      }
    } else {
      setDaysOfWeek([...daysOfWeek, day].sort());
    }
  };

  const handleAddTime = () => {
    setTimes([...times, '20:00']);
  };

  const handleRemoveTime = (index: number) => {
    if (times.length > 1) {
      setTimes(times.filter((_, i) => i !== index));
    }
  };

  const handleTimeChange = (index: number, val: string) => {
    const updated = [...times];
    updated[index] = val;
    setTimes(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const formData: MedFormValues = {
      name: name.trim(),
      strength: strength.trim(),
      form,
      purpose: purpose.trim(),
      instructions: instructions.trim(),
      times,
      daysOfWeek,
      startDate,
      endDate: endDate.trim(),
      criticality,
      pillCount: Number(pillCount) || 0,
      refillThreshold: Number(refillThreshold) || 0,
    };

    const result = MedSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((err) => {
        const path = err.path[0]?.toString() || 'form';
        fieldErrors[path] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    try {
      setSubmitting(true);
      await onSave(result.data);
      onClose();
    } catch (err: unknown) {
      setErrors({ form: err instanceof Error ? err.message : 'Failed to save medication' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <m.div
          key="med-modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/50 flex flex-col justify-end sm:justify-center p-0 sm:p-4 backdrop-blur-sm"
        >
          <m.div
            key="med-modal-content"
            initial={{ y: '100%', opacity: 0.8 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="bg-white w-full sm:max-w-lg mx-auto rounded-t-3xl sm:rounded-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-amber-50/50">
              <h2 className="text-xl font-bold text-gray-900">
                {initialValues?.id ? 'Edit Medication' : 'Add Medication'}
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-full hover:bg-gray-200 transition text-gray-500"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Form */}
            <form onSubmit={handleSubmit} className="overflow-y-auto px-6 py-4 space-y-4 flex-1">
              {errors.form && (
                <div className="p-3 bg-red-50 text-red-700 text-sm rounded-xl">
                  {errors.form}
                </div>
              )}

              {/* Medicine Name */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Medicine Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Metformin, Amlodipine"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none text-base"
                />
                {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
              </div>

              {/* Strength & Form */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Strength
                  </label>
                  <input
                    type="text"
                    value={strength}
                    onChange={(e) => setStrength(e.target.value)}
                    placeholder="e.g. 500mg, 5ml"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none text-base"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Form *
                  </label>
                  <select
                    value={form}
                    onChange={(e) => setForm(e.target.value as any)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none text-base bg-white"
                  >
                    <option value="tablet">💊 Tablet</option>
                    <option value="capsule">💊 Capsule</option>
                    <option value="syrup">🧴 Syrup</option>
                    <option value="injection">💉 Injection</option>
                  </select>
                </div>
              </div>

              {/* Purpose */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Purpose / Condition
                </label>
                <input
                  type="text"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="e.g. Blood sugar, Blood pressure"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none text-base"
                />
              </div>

              {/* Instructions */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Instructions
                </label>
                <textarea
                  rows={2}
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="e.g. Take after breakfast with warm water"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none text-base"
                />
              </div>

              {/* Timings */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-semibold text-gray-700">
                    Daily Timings *
                  </label>
                  <button
                    type="button"
                    onClick={handleAddTime}
                    className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 hover:text-amber-700"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Time
                  </button>
                </div>
                <div className="space-y-2">
                  {times.map((t, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        type="time"
                        value={t}
                        onChange={(e) => handleTimeChange(index, e.target.value)}
                        className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none text-base"
                      />
                      {times.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveTime(index)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {errors.times && <p className="text-xs text-red-500 mt-1">{errors.times}</p>}
              </div>

              {/* Days of week */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Days of Week *
                </label>
                <div className="flex gap-1.5 justify-between">
                  {DAYS.map((d) => {
                    const active = daysOfWeek.includes(d.value);
                    return (
                      <button
                        key={d.value}
                        type="button"
                        onClick={() => toggleDay(d.value)}
                        className={`w-10 h-10 rounded-full font-bold text-sm transition-all ${
                          active
                            ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {d.label}
                      </button>
                    );
                  })}
                </div>
                {errors.daysOfWeek && (
                  <p className="text-xs text-red-500 mt-1">{errors.daysOfWeek}</p>
                )}
              </div>

              {/* Criticality */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Criticality Level
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['low', 'normal', 'critical'] as const).map((level) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setCriticality(level)}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold capitalize transition ${
                        criticality === level
                          ? level === 'critical'
                            ? 'bg-red-500 text-white border-red-500'
                            : level === 'low'
                            ? 'bg-blue-500 text-white border-blue-500'
                            : 'bg-amber-500 text-white border-amber-500'
                          : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {level === 'critical' ? '⚠️ Critical' : level}
                    </button>
                  ))}
                </div>
              </div>

              {/* Pill Count & Refill Threshold */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Current Pills
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={pillCount}
                    onChange={(e) => setPillCount(parseInt(e.target.value, 10) || 0)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none text-base"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Refill Alert Below
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={refillThreshold}
                    onChange={(e) => setRefillThreshold(parseInt(e.target.value, 10) || 0)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none text-base"
                  />
                </div>
              </div>

              {/* Start & End Dates */}
              <div className="grid grid-cols-2 gap-3 pb-2">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    End Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none text-sm"
                  />
                </div>
              </div>
            </form>

            {/* Bottom Actions */}
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 px-4 border border-gray-300 rounded-xl font-bold text-gray-700 hover:bg-gray-100 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 py-3 px-4 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-xl font-bold shadow-lg shadow-amber-500/25 transition"
              >
                {submitting ? 'Saving...' : initialValues?.id ? 'Update Medicine' : 'Save Medicine'}
              </button>
            </div>
          </m.div>
        </m.div>
      )}
    </AnimatePresence>
  );
}
