'use client';

import { useAuth } from '../../../components/AuthProvider';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { createEvent } from '../../../lib/firestore';
import SignOutButton from '../../../components/SignOutButton';
import Link from 'next/link';

export default function CreateEvent() {
  const { appUser } = useAuth();
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [tableCount, setTableCount] = useState(2);
  const [duration, setDuration] = useState(5);
  const [loading, setLoading] = useState(false);

  if (appUser?.role !== 'moderator') return <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center text-white text-lg">Erişim Reddedildi</div>;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const eventId = await createEvent({
        title,
        description: description || undefined,
        location: location || undefined,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        createdBy: appUser.uid,
        tableCount,
        sessionDurationSeconds: duration * 60,
        status: 'waiting',
        currentRound: 0,
      });
      router.push(`/moderator/${eventId}`);
    } catch (err) {
      console.error('Error creating event:', err);
      alert(`Etkinlik oluşturma hatası: ${err instanceof Error ? err.message : 'Bilinmeyen hata'}`);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white p-4">
      <div className="max-w-md mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Etkinlik Oluştur</h1>
          <div className="flex items-center gap-3">
            <Link href="/moderator" className="text-gray-400 hover:text-white text-sm transition">← Geri</Link>
            <SignOutButton />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 bg-gray-800 p-6 rounded-xl border border-gray-700">
          <div>
            <label className="block text-sm font-bold mb-2 text-gray-300">Etkinlik Adı <span className="text-red-400">*</span></label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full p-3 border border-gray-600 rounded bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="Etkinlik adını girin"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-bold mb-2 text-gray-300">Açıklama</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              maxLength={300}
              className="w-full p-3 border border-gray-600 rounded bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none"
              placeholder="Etkinlik hakkında kısa bilgi..."
            />
            <p className="text-xs text-gray-500 mt-1">{description.length}/300</p>
          </div>

          <div>
            <label className="block text-sm font-bold mb-2 text-gray-300">Konum</label>
            <input
              type="text"
              value={location}
              onChange={e => setLocation(e.target.value)}
              className="w-full p-3 border border-gray-600 rounded bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="örn: Kahve Dünyası, Kadıköy"
            />
          </div>

          <div>
            <label className="block text-sm font-bold mb-2 text-gray-300">Planlanan Tarih & Saat</label>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={e => setScheduledAt(e.target.value)}
              className="w-full p-3 border border-gray-600 rounded bg-gray-700 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-bold mb-2 text-gray-300">Masa Sayısı: <span className="text-blue-400">{tableCount}</span></label>
            <input
              type="range"
              min="1"
              max="20"
              value={tableCount}
              onChange={e => setTableCount(parseInt(e.target.value))}
              className="w-full accent-blue-500"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1"><span>1</span><span>20</span></div>
          </div>

          <div>
            <label className="block text-sm font-bold mb-2 text-gray-300">Tur Süresi</label>
            <select
              value={duration}
              onChange={e => setDuration(parseInt(e.target.value))}
              className="w-full p-3 border border-gray-600 rounded bg-gray-700 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            >
              {[1, 2, 3, 5, 7, 10, 15].map(d => (
                <option key={d} value={d}>{d} dakika</option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={loading || !title.trim()}
            className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white p-3 rounded-xl hover:from-green-600 hover:to-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-bold transition shadow-lg"
          >
            {loading ? 'Oluşturuluyor...' : 'Etkinlik Oluştur'}
          </button>
        </form>
      </div>
    </div>
  );
}
