'use client';

import { useAuth } from '../../../components/AuthProvider';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { createEvent } from '../../../lib/firestore';
import SignOutButton from '../../../components/SignOutButton';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function CreateEvent() {
  const { appUser } = useAuth();
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [tableCount, setTableCount] = useState(2);
  const [duration, setDuration] = useState(5);
  const [maxParticipants, setMaxParticipants] = useState('');
  const [loading, setLoading] = useState(false);

  if (appUser?.role !== 'moderator') return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500">
      Erişim Reddedildi
    </div>
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const eventId = await createEvent({
        title,
        description: description || undefined,
        location: location || undefined,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        maxParticipants: maxParticipants ? parseInt(maxParticipants) : undefined,
        createdBy: appUser.uid,
        tableCount,
        sessionDurationSeconds: duration * 60,
        status: 'waiting',
        currentRound: 0,
      });
      router.push(`/moderator/${eventId}`);
    } catch (err) {
      console.error('Error creating event:', err);
      toast.error(`Etkinlik oluşturma hatası: ${err instanceof Error ? err.message : 'Bilinmeyen hata'}`);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-10 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/moderator" className="text-slate-400 hover:text-slate-700 transition text-sm font-medium">← Geri</Link>
            <h1 className="text-lg font-bold text-slate-900">Etkinlik Oluştur</h1>
          </div>
          <SignOutButton />
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">

            <div className="space-y-1">
              <label className="block text-sm font-medium text-slate-700">
                Etkinlik Adı <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-xl bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
                placeholder="Etkinlik adını girin"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-slate-700">Açıklama</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={3}
                maxLength={300}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-xl bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition resize-none"
                placeholder="Etkinlik hakkında kısa bilgi..."
              />
              <p className="text-xs text-slate-400 text-right">{description.length}/300</p>
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-slate-700">Konum</label>
              <input
                type="text"
                value={location}
                onChange={e => setLocation(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-xl bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
                placeholder="örn: Kahve Dünyası, Kadıköy"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-slate-700">Planlanan Tarih & Saat</label>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={e => setScheduledAt(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-xl bg-white text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-slate-700">
                Maksimum Katılımcı <span className="text-slate-400 font-normal">(isteğe bağlı)</span>
              </label>
              <input
                type="number"
                min="2"
                max="100"
                value={maxParticipants}
                onChange={e => setMaxParticipants(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-xl bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
                placeholder="Sınırsız"
              />
              <p className="text-xs text-slate-400">Dolarsa diğerleri bekleme listesine alınır</p>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">
                Masa Sayısı: <span className="text-blue-600 font-semibold">{tableCount}</span>
              </label>
              <input
                type="range"
                min="1"
                max="20"
                value={tableCount}
                onChange={e => setTableCount(parseInt(e.target.value))}
                className="w-full accent-blue-600"
              />
              <div className="flex justify-between text-xs text-slate-400"><span>1</span><span>20</span></div>
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-slate-700">Tur Süresi</label>
              <select
                value={duration}
                onChange={e => setDuration(parseInt(e.target.value))}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-xl bg-white text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
              >
                {[1, 2, 3, 5, 7, 10, 15].map(d => (
                  <option key={d} value={d}>{d} dakika</option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !title.trim()}
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm"
          >
            {loading ? 'Oluşturuluyor...' : 'Etkinlik Oluştur'}
          </button>
        </form>
      </main>
    </div>
  );
}
