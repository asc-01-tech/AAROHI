// app/elder/camera/page.tsx
// Prescription Scanner with Gemini Multimodal AI
'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Camera, Check, AlertTriangle, Sparkles } from 'lucide-react';
import { compressImage } from '@/lib/compressImage';
import { launchConfetti } from '@/lib/celebrate';

interface ScannedMed {
  name: string;
  strength?: string;
  form: 'capsule' | 'tablet' | 'syrup' | 'injection';
  timesPerDay?: number;
  times?: string[];
  instructions?: string;
  selected?: boolean;
}

export default function CameraPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [adding, setAdding] = useState(false);
  const [meds, setMeds] = useState<ScannedMed[]>([]);
  const [disclaimer, setDisclaimer] = useState<string | null>(null);

  const handleCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressed = await compressImage(file);
      const url = URL.createObjectURL(compressed);
      setImagePreview(url);
      setScanning(true);

      const formData = new FormData();
      formData.append('image', compressed);

      const res = await fetch('/api/scan', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.meds && data.meds.length > 0) {
        setMeds(data.meds.map((m: any) => ({ ...m, selected: true })));
      } else {
        alert('No readable medications found. Please take a clearer photo.');
      }
      setDisclaimer(data.disclaimer);
    } catch {
      alert('Failed to scan prescription. Please try again.');
    } finally {
      setScanning(false);
    }
  };

  const toggleSelectMed = (index: number) => {
    setMeds((prev) =>
      prev.map((m, i) => (i === index ? { ...m, selected: !m.selected } : m))
    );
  };

  const handleAddAll = async () => {
    const selectedMeds = meds.filter((m) => m.selected);
    if (selectedMeds.length === 0) return;

    try {
      setAdding(true);
      for (const med of selectedMeds) {
        await fetch('/api/meds', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: med.name,
            strength: med.strength || '',
            form: med.form || 'tablet',
            instructions: med.instructions || '',
            times: med.times && med.times.length > 0 ? med.times : ['08:00'],
            daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
            startDate: new Date().toISOString().split('T')[0],
            criticality: 'normal',
            pillCount: 30,
            refillThreshold: 7,
          }),
        });
      }

      await launchConfetti();
      alert(`Added ${selectedMeds.length} prescription medicines!`);
      router.push('/elder');
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-white flex flex-col p-4 pb-12">
      {/* Top Header */}
      <div className="flex items-center justify-between py-2 border-b border-gray-100 mb-4">
        <button
          onClick={() => router.back()}
          className="p-2 text-gray-600 hover:bg-gray-100 rounded-full"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="font-bold text-gray-900 text-lg flex items-center gap-1.5">
          <Sparkles className="w-5 h-5 text-amber-500" />
          <span>Scan Prescription</span>
        </h1>
        <div className="w-8" />
      </div>

      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        capture="environment"
        onChange={handleCapture}
        className="hidden"
      />

      {/* Main Upload / Camera View */}
      {!imagePreview && (
        <div className="flex-1 flex flex-col justify-center items-center text-center p-6 space-y-6">
          <div className="w-24 h-24 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center">
            <Camera className="w-12 h-12" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Take a Photo</h2>
            <p className="text-sm text-gray-500 max-w-xs mt-1">
              Gemini AI will read the medicine names, doses, and schedules from your prescription.
            </p>
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full max-w-xs py-4 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl font-bold shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 text-base transition"
          >
            <Camera className="w-5 h-5" /> Open Camera
          </button>
        </div>
      )}

      {/* Preview & Results */}
      {imagePreview && (
        <div className="space-y-4">
          <div className="relative rounded-2xl overflow-hidden border max-h-48 bg-black/5 flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imagePreview} alt="Prescription" className="object-contain max-h-48" />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-3 py-1.5 rounded-full font-bold"
            >
              Retake Photo
            </button>
          </div>

          {scanning && (
            <div className="py-8 text-center space-y-3">
              <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="font-bold text-gray-700 text-sm">
                Gemini AI is reading prescription...
              </p>
            </div>
          )}

          {!scanning && meds.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-bold text-gray-800 text-sm">
                Detected Medicines ({meds.length})
              </h3>

              <div className="space-y-2">
                {meds.map((med, index) => (
                  <div
                    key={index}
                    onClick={() => toggleSelectMed(index)}
                    className={`p-3.5 rounded-2xl border flex items-center justify-between cursor-pointer transition ${
                      med.selected
                        ? 'border-amber-500 bg-amber-50/50'
                        : 'border-gray-200 bg-gray-50 opacity-60'
                    }`}
                  >
                    <div>
                      <p className="font-bold text-gray-900 text-sm">{med.name}</p>
                      <p className="text-xs text-gray-500">
                        {med.strength} • {med.form} • {med.instructions || 'Daily'}
                      </p>
                    </div>
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center ${
                        med.selected ? 'bg-amber-500 text-white' : 'border border-gray-300'
                      }`}
                    >
                      {med.selected && <Check className="w-4 h-4" />}
                    </div>
                  </div>
                ))}
              </div>

              {disclaimer && (
                <div className="p-3 bg-amber-50 rounded-xl flex items-start gap-2 text-xs text-amber-800">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>{disclaimer}</span>
                </div>
              )}

              <button
                onClick={handleAddAll}
                disabled={adding}
                className="w-full py-4 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-2xl shadow-lg shadow-amber-500/25 transition mt-4"
              >
                {adding ? 'Adding...' : 'Confirm & Add to Schedule'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
