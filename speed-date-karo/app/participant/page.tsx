'use client';

import { useAuth } from '../../components/AuthProvider';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getOpenEvents, joinEvent } from '../../lib/firestore';
import { Event } from '../../types';
import SignOutButton from '../../components/SignOutButton';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { SkeletonEventList } from '../../components/Skeleton';

export default function Participant() {
  const { appUser } = useAuth();
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [joiningId, setJoiningId] = useState<string | null>(null);

  useEffect(() => {
    if (appUser?.role === 'participant') {
      getOpenEvents().then(setEvents).finally(() => setLoading(false));
    }
  }, [appUser]);

  if (appUser?.role !== 'participant') return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500">
      Erişim Reddedildi
    </div>
  );

  const handleJoin = async (eventId: string) => {
    if (!appUser) return;
    setJoiningId(eventId);
    try {
      const { waitlisted } = await joinEvent(eventId, {
        uid: appUser.uid,
        displayName: appUser.displayName,
        isReady: false,
      });
      if (waitlisted) {
        toast('Etkinlik dolu — bekleme listesine alındınız!', { icon: '📋', duration: 5000 });
        return;
      }
      router.push(`/participant/${eventId}`);
    } finally {
      setJoiningId(null);
    }
  };

  const statusLabel = (s: Event['status']) =>
    s === 'active' ? 'Devam Ediyor' : 'Bekleniyor';
  const statusClass = (s: Event['status']) =>
    s === 'active'
      ? 'bg-green-100 text-green-700'
      : 'bg-amber-100 text-amber-700';

  if (loading) return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="h-5 w-40 bg-slate-200 rounded-lg animate-pulse" />
          <div className="h-8 w-16 bg-slate-200 rounded-lg animate-pulse" />
        </div>
      </header>
      <main className="max-w-2xl mx-auto px-4 py-6">
        <SkeletonEventList />
      </main>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-10 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <h1 className="text-lg font-bold text-slate-900">Etkinlikler</h1>
          <div className="flex items-center gap-2">
            <Link href="/profile" className="px-3 py-1.5 text-sm font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors">
              Profil
            </Link>
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {events.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 shadow-sm">
            <div className="text-4xl mb-3">🗓</div>
            <p className="text-slate-500 font-medium">Şu anda açık etkinlik yok</p>
            <p className="text-slate-400 text-sm mt-1">Yeni etkinlikler moderatörler tarafından oluşturulur</p>
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
                    {event.description && (
                      <p className="text-sm text-slate-600 mt-1">{event.description}</p>
                    )}
                    <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
                      {event.location && (
                        <span className="text-xs text-slate-400">📍 {event.location}</span>
                      )}
                      {event.scheduledAt && (
                        <span className="text-xs text-slate-400">
                          🗓 {new Date(event.scheduledAt).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' })}
                        </span>
                      )}
                      <span className="text-xs text-slate-400">🪑 {event.tableCount} masa</span>
                      <span className="text-xs text-slate-400">⏱ {event.sessionDurationSeconds / 60} dk/tur</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleJoin(event.eventId)}
                    disabled={joiningId === event.eventId}
                    className="shrink-0 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-semibold rounded-xl hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 transition shadow-sm"
                  >
                    {joiningId === event.eventId ? '...' : 'Katıl'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
