'use client';

import { useAuth } from '../../components/AuthProvider';
import { useEffect, useState } from 'react';
import { getMyEvents, deleteEvent } from '../../lib/firestore';
import { Event } from '../../types';
import Link from 'next/link';
import SignOutButton from '../../components/SignOutButton';
import { SkeletonEventList } from '../../components/Skeleton';

export default function Moderator() {
  const { appUser } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (appUser?.role === 'moderator') {
      getMyEvents(appUser.uid).then(setEvents).finally(() => setLoading(false));
    }
  }, [appUser]);

  if (appUser?.role !== 'moderator') return <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center text-white text-lg">Erişim Reddedildi</div>;

  const handleDelete = async (eventId: string) => {
    if (confirm('Silmek istediğinize emin misiniz?')) {
      await deleteEvent(eventId);
      setEvents(events.filter(e => e.eventId !== eventId));
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div className="h-8 w-48 bg-gray-700 rounded animate-pulse" />
          <div className="h-8 w-20 bg-gray-700 rounded animate-pulse" />
        </div>
        <SkeletonEventList />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Etkinliklerim</h1>
          <SignOutButton />
        </div>
        <Link href="/moderator/create" className="bg-gradient-to-r from-green-500 to-green-600 text-white px-4 py-2 mb-6 inline-block rounded hover:from-green-600 hover:to-green-700 transition font-semibold shadow-lg">+ Etkinlik Oluştur</Link>

        {events.length === 0 ? (
          <div className="text-center py-12 bg-gray-800 rounded border border-gray-700">
            <p className="text-gray-400 text-lg">Henüz etkinlik yok. Yeni bir etkinlik oluşturun!</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {events.map(event => (
              <div key={event.eventId} className="flex justify-between items-center p-4 border border-gray-700 rounded bg-gray-800 hover:bg-gray-700 transition">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-white">{event.title}</h3>
                  <p className="text-sm text-gray-400">Durum: <span className={event.status === 'active' ? 'text-green-400 font-semibold' : 'text-yellow-400 font-semibold'}>{event.status === 'active' ? 'Aktif' : 'Bekleniyor'}</span> | Masalar: {event.tableCount}</p>
                </div>
                <div className="space-x-2 flex">
                  <Link href={`/moderator/${event.eventId}`} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition inline-block font-semibold">Görüntüle</Link>
                  <button onClick={() => handleDelete(event.eventId)} className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition font-semibold">Sil</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}