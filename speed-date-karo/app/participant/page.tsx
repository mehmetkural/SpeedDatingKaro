'use client';

import { useAuth } from '../../components/AuthProvider';
import { useEffect, useState } from 'react';
import { getOpenEvents, joinEvent } from '../../lib/firestore';
import { Event } from '../../types';
import SignOutButton from '../../components/SignOutButton';

export default function Participant() {
  const { appUser } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (appUser?.role === 'participant') {
      getOpenEvents().then(setEvents).finally(() => setLoading(false));
    }
  }, [appUser]);

  if (appUser?.role !== 'participant') return <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center text-white text-lg">Erişim Reddedildi</div>;

  const handleJoin = async (eventId: string) => {
    if (!appUser) return;
    await joinEvent(eventId, {
      uid: appUser.uid,
      displayName: appUser.displayName,
      isReady: false
    });
    window.location.href = `/participant/${eventId}`;
  };

  if (loading) return <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center text-white text-lg">Yükleniyor...</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white p-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Açık Etkinlikler</h1>
          <SignOutButton />
        </div>
        {events.length === 0 ? (
          <div className="text-center py-12 bg-gray-800 rounded border border-gray-700">
            <p className="text-gray-400 text-lg">Şu anda açık etkinlik yok</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {events.map(event => (
              <div key={event.eventId} className="flex justify-between items-center p-4 border border-gray-700 rounded bg-gray-800 hover:bg-gray-700 transition">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-white">{event.title}</h3>
                  <p className="text-sm text-gray-400">Masalar: {event.tableCount} | Süre: {event.sessionDurationSeconds / 60} dakika</p>
                </div>
                <button
                  onClick={() => handleJoin(event.eventId)}
                  className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-2 rounded hover:from-blue-600 hover:to-blue-700 font-semibold transition shadow-lg"
                >
                  Katıl
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}