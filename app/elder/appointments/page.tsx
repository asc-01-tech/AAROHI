// app/elder/appointments/page.tsx
// Elder's appointment view — read-only list of upcoming appointments.
'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar } from 'lucide-react';

interface Appointment {
  id: string;
  doctorName: string;
  specialty: string;
  location: string;
  dateTime: string;
  notes?: string;
}

export default function ElderAppointmentsPage() {
  const router  = useRouter();
  const [appts, setAppts] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/appointments')
      .then(r => r.json())
      .then(data => {
        setAppts(data.appointments ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.back()}
          className="w-12 h-12 rounded-full bg-white shadow flex items-center justify-center text-2xl"
          aria-label="Back"
        >
          ←
        </button>
        <h1 className="text-2xl font-bold text-indigo-800">📅 Appointments</h1>
      </div>

      {loading && (
        <div className="space-y-4">
          {[1,2,3].map(i => (
            <div key={i} className="animate-pulse bg-white rounded-3xl h-28 shadow" />
          ))}
        </div>
      )}

      {!loading && appts.length === 0 && (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">📅</div>
          <p className="text-xl text-gray-500">No upcoming appointments</p>
        </div>
      )}

      <div className="space-y-4">
        {appts.map(appt => {
          const dt = new Date(appt.dateTime);
          return (
            <div key={appt.id} className="bg-white rounded-3xl p-5 shadow-md">
              <div className="flex items-start gap-3">
                <Calendar className="text-indigo-500 mt-1 flex-shrink-0" size={24} />
                <div className="flex-1">
                  <p className="text-xl font-bold text-gray-800">Dr. {appt.doctorName}</p>
                  {appt.specialty && <p className="text-gray-500">{appt.specialty}</p>}
                  <p className="text-indigo-600 font-semibold mt-1">
                    {dt.toLocaleDateString('en-IN', { weekday:'short', day:'numeric', month:'short' })}
                    {' '}at{' '}
                    {dt.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' })}
                  </p>
                  {appt.location && <p className="text-gray-500 text-sm mt-1">📍 {appt.location}</p>}
                  {appt.notes && <p className="text-gray-500 text-sm mt-1 italic">{appt.notes}</p>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

