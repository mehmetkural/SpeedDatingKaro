'use client';

import { useAuth } from '../../components/AuthProvider';
import { useEffect, useState } from 'react';
import { getMyEvents, deleteEvent } from '../../lib/firestore';
import { Event } from '../../types';
import Link from 'next/link';
import SignOutButton from '../../components/SignOutButton';
import { SkeletonEventList } from '../../components/Skeleton';
import toast from 'react-hot-toast';

const statusLabel = (s: Event['status']) =>
  s === 'completed' ? 'Tamamlandı' : s === 'active' ? 'Devam Ediyor' : 'Bekleniyor';
const statusClass = (s: Event['status']) =>
  s === 'completed' ? 'bg-slate-100 text-slate-600'
    : s === 'active' ? 'bg-green-100 text-green-700'
      : 'bg-amber-100 text-amber-700';

export default function Moderator() {
  const { appUser } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (appUser?.role === 'moderator') {
      getMyEvents(appUser.uid).then(setEvents).finally(() => setLoading(false));
    }
  }, [appUser]);

  if (appUser?.role !== 'moderator') return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500">
      Erişim Reddedildi
    </div>
  );

  const handleDelete = async (eventId: string) => {
    if (!confirm('Bu etkinliği silmek istediğinize emin misiniz?')) return;
    try {
      await deleteEvent(eventId);
      setEvents(events.filter(e => e.eventId !== eventId));
      toast.success('Etkinlik silindi');
    } catch {
      toast.error('Etkinlik silinemedi');
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200 h-14" />
      <div className="max-w-4xl mx-auto px-4 py-6"><SkeletonEventList /></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-10 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <h1 className="text-lg font-bold text-slate-900">Etkinliklerim</h1>
          <div className="flex items-center gap-2">
            <Link
              href="/moderator/create"
              className="px-4 py-1.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-semibold rounded-lg hover:from-blue-700 hover:to-purple-700 transition shadow-sm"
            >
              + Yeni
            </Link>
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {events.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 shadow-sm">
            <div className="text-4xl mb-3">📅</div>
            <p className="text-slate-500 font-medium">Henüz etkinlik yok</p>
            <Link
              href="/moderator/create"
              className="inline-block mt-4 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-semibold rounded-xl hover:from-blue-700 hover:to-purple-700 transition shadow-sm"
            >
              İlk Etkinliği Oluştur
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {events.map(event => (
              <div key={event.eventId} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-slate-900">{event.title}</h3>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusClass(event.status)}`}>
                        {statusLabel(event.status)}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5">
                      {event.location && <span className="text-xs text-slate-400">📍 {event.location}</span>}
                      {event.scheduledAt && (
                        <span className="text-xs text-slate-400">
                          🗓 {new Date(event.scheduledAt).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' })}
                        </span>
                      )}
                      <span className="text-xs text-slate-400">🪑 {event.tableCount} masa</span>
                      <span className="text-xs text-slate-400">⏱ {event.sessionDurationSeconds / 60} dk/tur</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Link
                      href={`/moderator/${event.eventId}`}
                      className="px-3 py-1.5 bg-blue-50 text-blue-700 text-sm font-semibold rounded-lg hover:bg-blue-100 transition"
                    >
                      Yönet
                    </Link>
                    <button
                      onClick={() => handleDelete(event.eventId)}
                      className="px-3 py-1.5 bg-red-50 text-red-600 text-sm font-semibold rounded-lg hover:bg-red-100 transition"
                    >
                      Sil
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
