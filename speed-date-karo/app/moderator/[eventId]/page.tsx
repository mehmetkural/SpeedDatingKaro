'use client';

import { useAuth } from '../../../components/AuthProvider';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { listenToEvent, listenToParticipants, generateMatches, listenToMatches, listenToAllMatches, checkAndAdvanceRound, cancelSession, sendAnnouncement, listenToWaitlist, joinEvent, leaveWaitlist, pauseSession, resumeSession } from '../../../lib/firestore';
import { Event, Participant, SpeedMatch, WaitlistEntry } from '../../../types';
import SignOutButton from '../../../components/SignOutButton';
import toast from 'react-hot-toast';
import { SkeletonStatGrid } from '../../../components/Skeleton';

export default function ModeratorEventView() {
  useAuth();
  const params = useParams();
  const eventId = params.eventId as string;
  const [event, setEvent] = useState<Event | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [matches, setMatches] = useState<SpeedMatch[]>([]);
  const [allMatches, setAllMatches] = useState<SpeedMatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [announcementText, setAnnouncementText] = useState('');
  const [sendingAnnouncement, setSendingAnnouncement] = useState(false);
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);

  useEffect(() => {
    if (!eventId) return;

    const unsubscribeEvent = listenToEvent(eventId, setEvent);
    const unsubscribeParticipants = listenToParticipants(eventId, setParticipants);
    const unsubscribeAllMatches = listenToAllMatches(eventId, setAllMatches);
    const unsubscribeWaitlist = listenToWaitlist(eventId, setWaitlist);

    return () => {
      unsubscribeEvent();
      unsubscribeParticipants();
      unsubscribeAllMatches();
      unsubscribeWaitlist();
    };
  }, [eventId]);

  useEffect(() => {
    if (!event || event.currentRound === 0) return;

    const unsubscribeMatches = listenToMatches(eventId, event.currentRound, setMatches);
    return () => unsubscribeMatches();
    // event object intentionally omitted — only currentRound matters here
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, event?.currentRound]);

  // Auto-advance round when all matches completed
  useEffect(() => {
    if (!event || event.status !== 'active' || matches.length === 0) return;

    const completedMatches = matches.filter(m => m.status === 'completed').length;
    const totalMatches = matches.length;

    if (completedMatches > 0 && completedMatches === totalMatches) {
      const timer = setTimeout(() => {
        checkAndAdvanceRound(eventId, event.currentRound).catch(err =>
          console.error('Error advancing round:', err)
        );
      }, 1000);
      return () => clearTimeout(timer);
    }
    // event object intentionally omitted to avoid double-firing
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matches, event?.status, eventId, event?.currentRound]);

  if (!event) return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div className="h-8 w-56 bg-gray-700 rounded animate-pulse" />
          <div className="h-8 w-20 bg-gray-700 rounded animate-pulse" />
        </div>
        <SkeletonStatGrid />
      </div>
    </div>
  );

  const handleStartSession = async () => {
    if (participants.length < 2) {
      toast.error('En az 2 katılımcı gerekli');
      return;
    }
    setLoading(true);
    try {
      await generateMatches(eventId, event.tableCount);
    } catch (err) {
      console.error('Error starting session:', err);
      toast.error(`Oturum başlatma hatası: ${err instanceof Error ? err.message : 'Bilinmeyen hata'}`);
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
      toast.error(`Hata: ${err instanceof Error ? err.message : 'Bilinmeyen hata'}`);
    }
    setLoading(false);
  };

  const handleTogglePause = async () => {
    if (!event) return;
    setLoading(true);
    try {
      if (event.paused) {
        await resumeSession(eventId, event.pausedAt!, event.pauseAccumulatedSeconds || 0);
      } else {
        await pauseSession(eventId);
      }
    } catch (err) {
      console.error('Error toggling pause:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAdmitFromWaitlist = async (entry: WaitlistEntry) => {
    try {
      await leaveWaitlist(eventId, entry.uid);
      await joinEvent(eventId, { uid: entry.uid, displayName: entry.displayName, isReady: false });
    } catch (err) {
      console.error('Error admitting from waitlist:', err);
    }
  };

  const handleSendAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!announcementText.trim()) return;
    setSendingAnnouncement(true);
    try {
      await sendAnnouncement(eventId, announcementText.trim());
      setAnnouncementText('');
      toast.success('Duyuru gönderildi');
    } catch (err) {
      console.error('Error sending announcement:', err);
    } finally {
      setSendingAnnouncement(false);
    }
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
          <Link
            href="/moderator"
            className="block w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 rounded font-bold hover:from-blue-600 hover:to-blue-700 transition shadow-lg text-center"
          >
            ← Etkinliklere Dön
          </Link>
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
            <div className="space-y-3 mb-6">
              <div className="flex gap-3">
                <button
                  onClick={handleTogglePause}
                  disabled={loading}
                  className={`flex-1 p-3 rounded font-bold transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ${
                    event.paused
                      ? 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700'
                      : 'bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700'
                  } text-white`}
                >
                  {event.paused ? '▶ Devam Et' : '⏸ Duraklat'}
                </button>
                <button
                  onClick={handleCancelSession}
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-red-500 to-red-600 text-white p-3 rounded font-bold hover:from-red-600 hover:to-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-lg"
                >
                  ✕ İptal Et
                </button>
              </div>
              <form onSubmit={handleSendAnnouncement} className="flex gap-2">
                <input
                  type="text"
                  value={announcementText}
                  onChange={e => setAnnouncementText(e.target.value)}
                  placeholder="Tüm katılımcılara duyuru gönder..."
                  maxLength={200}
                  className="flex-1 p-3 border border-gray-600 rounded bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 text-sm"
                />
                <button
                  type="submit"
                  disabled={sendingAnnouncement || !announcementText.trim()}
                  className="px-4 py-2 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white font-bold rounded hover:from-yellow-600 hover:to-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-lg text-sm whitespace-nowrap"
                >
                  {sendingAnnouncement ? '...' : '📢 Gönder'}
                </button>
              </form>
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

          {waitlist.length > 0 && (
            <div className="mb-6">
              <h2 className="text-xl font-bold mb-3 text-white border-b border-gray-700 pb-2">
                Bekleme Listesi ({waitlist.length})
              </h2>
              <ul className="space-y-2">
                {waitlist.map(entry => (
                  <li key={entry.uid} className="flex items-center p-3 bg-gray-800 rounded border border-orange-700 hover:bg-gray-700 transition">
                    <span className="flex-1 font-semibold text-white">{entry.displayName}</span>
                    {event.status === 'waiting' && (
                      <button
                        onClick={() => handleAdmitFromWaitlist(entry)}
                        className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition font-semibold"
                      >
                        Kabul Et
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {allMatches.length > 0 && (() => {
            const rounds = Array.from(new Set(allMatches.map(m => m.round))).sort((a, b) => a - b);
            return rounds.map(round => {
              const roundMatches = allMatches.filter(m => m.round === round).sort((a, b) => a.tableNumber - b.tableNumber);
              const allDone = roundMatches.every(m => m.status === 'completed');
              return (
                <div key={round} className="mb-6">
                  <h2 className="text-xl font-bold mb-3 text-white border-b border-gray-700 pb-2 flex items-center gap-3">
                    Tur {round} Maçları
                    <span className={`text-sm px-2 py-1 rounded font-medium ${allDone ? 'bg-green-700 text-green-200' : round === event.currentRound ? 'bg-yellow-700 text-yellow-200' : 'bg-gray-700 text-gray-300'}`}>
                      {allDone ? 'Tamamlandı' : round === event.currentRound ? 'Devam Ediyor' : 'Bekliyor'}
                    </span>
                  </h2>
                  <ul className="space-y-2">
                    {roundMatches.map(match => (
                      <li key={match.matchId} className="p-3 bg-gray-800 rounded border border-gray-700">
                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-white">Masa {match.tableNumber}</span>
                          <span className={`px-2 py-1 rounded text-white font-medium text-sm ${match.status === 'completed' ? 'bg-green-600' : 'bg-yellow-600'}`}>
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
                </div>
              );
            });
          })()}
        </>
      )}
      </div>
    </div>
  );
}