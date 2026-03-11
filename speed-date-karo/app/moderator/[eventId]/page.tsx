'use client';

import { useAuth } from '../../../components/AuthProvider';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { listenToEvent, listenToParticipants, generateMatches, listenToMatches, checkAndAdvanceRound, cancelSession } from '../../../lib/firestore';
import { Event, Participant, SpeedMatch } from '../../../types';
import SignOutButton from '../../../components/SignOutButton';

export default function ModeratorEventView() {
  const { appUser } = useAuth();
  const params = useParams();
  const eventId = params.eventId as string;
  const [event, setEvent] = useState<Event | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [matches, setMatches] = useState<SpeedMatch[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!eventId) return;

    const unsubscribeEvent = listenToEvent(eventId, setEvent);
    const unsubscribeParticipants = listenToParticipants(eventId, setParticipants);

    return () => {
      unsubscribeEvent();
      unsubscribeParticipants();
    };
  }, [eventId]);

  useEffect(() => {
    if (!event || event.currentRound === 0) return;

    const unsubscribeMatches = listenToMatches(eventId, event.currentRound, setMatches);
    return () => unsubscribeMatches();
  }, [eventId, event?.currentRound]);

  // Auto-advance round when all matches completed
  useEffect(() => {
    if (!event || event.status !== 'active' || matches.length === 0) return;

    const completedMatches = matches.filter(m => m.status === 'completed').length;
    const totalMatches = matches.length;

    // Check if all matches are completed
    if (completedMatches > 0 && completedMatches === totalMatches) {
      console.log(`✓ All ${totalMatches} matches completed! Auto-advancing...`);
      // Wait a moment before advancing (for UI update)
      const timer = setTimeout(() => {
        checkAndAdvanceRound(eventId, event.currentRound).catch(err =>
          console.error('Error advancing round:', err)
        );
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [matches, event?.status, eventId, event?.currentRound]);

  if (!event) return <div className="flex min-h-screen items-center justify-center">Loading...</div>;

  const handleStartSession = async () => {
    if (participants.length < 2) {
      alert('At least 2 participants required');
      return;
    }
    setLoading(true);
    try {
      await generateMatches(eventId, event.tableCount);
    } catch (err) {
      console.error('Error starting session:', err);
      alert(`Error starting session: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
    setLoading(false);
  };

  const handleCancelSession = async () => {
    if (!confirm('Oturumu iptal etmek istediğinizden emin misiniz?')) {
      return;
    }
    setLoading(true);
    try {
      await cancelSession(eventId);
    } catch (err) {
      console.error('Error canceling session:', err);
      alert(`Hata: ${err instanceof Error ? err.message : 'Bilinmeyen hata'}`);
    }
    setLoading(false);
  };

  const completedMatches = matches.filter(m => m.status === 'completed').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">{event.title}</h1>
          <SignOutButton />
        </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="p-4 bg-gradient-to-br from-blue-400 to-blue-500 rounded shadow-md">
          <p className="text-sm text-white/80">Durum</p>
          <p className="text-2xl font-bold text-white">
            {event.status === 'waiting' && 'Bekleniyor'}
            {event.status === 'completed' && 'Tamamlandı'}
            {event.status === 'active' && matches.length > 0 && completedMatches === matches.length && 'Tur Tamamlandı'}
            {event.status === 'active' && (matches.length === 0 || completedMatches < matches.length) && 'Aktif'}
          </p>
        </div>
        <div className="p-4 bg-gradient-to-br from-purple-400 to-purple-500 rounded shadow-md">
          <p className="text-sm text-white/80">Round</p>
          <p className="text-2xl font-bold text-white">{event.currentRound}{event.totalRounds ? `/${event.totalRounds}` : ''}</p>
        </div>
        <div className="p-4 bg-gradient-to-br from-green-400 to-green-500 rounded shadow-md">
          <p className="text-sm text-white/80">Participants</p>
          <p className="text-2xl font-bold text-white">{participants.length}</p>
        </div>
        <div className="p-4 bg-gradient-to-br from-orange-400 to-orange-500 rounded shadow-md">
          <p className="text-sm text-white/80">Tables</p>
          <p className="text-2xl font-bold text-white">{event.tableCount}</p>
        </div>
      </div>

      {event.status === 'completed' && (
        <div className="space-y-4 text-center">
          <div className="p-8 bg-gradient-to-r from-green-600 to-green-500 rounded border-2 border-green-400 shadow-lg">
            <p className="text-white font-bold text-3xl">✨ Etkinlik Başarıyla Tamamlandı!</p>
            <p className="text-white text-lg mt-2">{participants.length} katılımcı, {event.currentRound} tur</p>
          </div>
          <a
            href="/moderator"
            className="block w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 rounded font-bold hover:from-blue-600 hover:to-blue-700 transition shadow-lg"
          >
            ← Etkinliklere Dön
          </a>
        </div>
      )}

      {event.status !== 'completed' && (
        <>
          {event.status === 'waiting' && (
            <button
              onClick={handleStartSession}
              disabled={loading || participants.length < 2}
              className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white p-3 rounded font-bold hover:from-green-600 hover:to-green-700 disabled:opacity-50 disabled:cursor-not-allowed mb-6 transition shadow-lg"
            >
              {loading ? 'Başlatılıyor...' : 'Oturumu Başlat'}
            </button>
          )}

          {event.status === 'active' && (
            <div className="flex gap-4 mb-6">
              <button
                onClick={handleCancelSession}
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-red-500 to-red-600 text-white p-3 rounded font-bold hover:from-red-600 hover:to-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-lg"
              >
                {loading ? 'İptal Ediliyor...' : '✕ Oturumu İptal Et'}
              </button>
            </div>
          )}

          {event.status === 'active' && matches.length > 0 && (
            <div className="p-4 bg-gradient-to-r from-green-600 to-green-500 rounded mb-6 border border-green-400">
              <p className="text-lg font-bold text-white">İlerleme: {completedMatches}/{matches.length} maç tamamlandı</p>
            </div>
          )}

          <h2 className="text-2xl font-bold mb-4 text-white border-b border-gray-700 pb-2">Katılımcılar ({participants.length})</h2>
          <ul className="space-y-2 mb-6">
            {participants.map(p => (
              <li key={p.uid} className="flex items-center p-3 bg-gray-800 rounded border border-gray-700 hover:bg-gray-700 transition">
                <span className="flex-1 font-semibold text-white">{p.displayName}</span>
                {p.isReady && <span className="text-green-400 font-bold">✓ Hazır</span>}
              </li>
            ))}
          </ul>

          {matches.length > 0 && (
            <>
              <h2 className="text-2xl font-bold mb-4 text-white border-b border-gray-700 pb-2">Tur {event.currentRound} Maçları</h2>
              <ul className="space-y-2">
                {matches.map(match => (
                  <li key={match.matchId} className="p-3 bg-gray-800 rounded border border-gray-700 hover:bg-gray-700 transition">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-white">Masa {match.tableNumber}</span>
                      <span className={`px-2 py-1 rounded text-white font-medium ${match.status === 'completed' ? 'bg-green-600' : 'bg-yellow-600'}`}>
                        {match.status === 'completed' ? 'Tamamlandı' : 'Devam Ediyor'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400 mt-1">
                      {match.participant2Uid
                        ? `${participants.find(p => p.uid === match.participant1Uid)?.displayName ?? match.participant1Uid.slice(0, 8)} ↔ ${participants.find(p => p.uid === match.participant2Uid)?.displayName ?? match.participant2Uid.slice(0, 8)}`
                        : 'Eşsiz'}
                    </p>
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
      </div>
    </div>
  );
}