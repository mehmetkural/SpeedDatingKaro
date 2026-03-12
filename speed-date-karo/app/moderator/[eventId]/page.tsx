'use client';

import { useAuth } from '../../../components/AuthProvider';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { listenToEvent, listenToParticipants, generateMatches, listenToMatches, listenToAllMatches, checkAndAdvanceRound, cancelSession, sendAnnouncement, listenToWaitlist, joinEvent, leaveWaitlist, pauseSession, resumeSession } from '../../../lib/firestore';
import { Event, Participant, SpeedMatch, WaitlistEntry } from '../../../types';
import SignOutButton from '../../../components/SignOutButton';
import toast from 'react-hot-toast';

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
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200 h-14" />
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-20 bg-slate-200 rounded-2xl animate-pulse" />
        ))}
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

  const completedMatchCount = matches.filter(m => m.status === 'completed').length;

  const statusLabel =
    event.status === 'waiting' ? 'Bekleniyor' :
    event.status === 'completed' ? 'Tamamlandı' :
    matches.length > 0 && completedMatchCount === matches.length ? 'Tur Tamamlandı' :
    'Aktif';

  const statusClass =
    event.status === 'waiting' ? 'bg-amber-100 text-amber-700' :
    event.status === 'completed' ? 'bg-slate-100 text-slate-600' :
    'bg-green-100 text-green-700';

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-10 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/moderator" className="text-slate-400 hover:text-slate-700 transition text-sm font-medium shrink-0">← Geri</Link>
            <h1 className="text-lg font-bold text-slate-900 truncate">{event.title}</h1>
            <span className={`px-2 py-0.5 text-xs font-medium rounded-full shrink-0 ${statusClass}`}>{statusLabel}</span>
          </div>
          <SignOutButton />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-4">

        {/* Stats grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Tur', value: `${event.currentRound}${event.totalRounds ? `/${event.totalRounds}` : ''}` },
            { label: 'Katılımcı', value: participants.length },
            { label: 'Masa', value: event.tableCount },
            { label: 'Süre', value: `${event.sessionDurationSeconds / 60}dk` },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 text-center">
              <p className="text-2xl font-bold text-slate-900">{value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Completed state */}
        {event.status === 'completed' && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center shadow-sm">
            <p className="text-green-800 font-bold text-xl">Etkinlik Tamamlandı!</p>
            <p className="text-green-600 text-sm mt-1">{participants.length} katılımcı · {event.currentRound} tur</p>
            <Link
              href="/moderator"
              className="inline-block mt-4 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-semibold rounded-xl hover:from-blue-700 hover:to-purple-700 transition shadow-sm"
            >
              ← Etkinliklere Dön
            </Link>
          </div>
        )}

        {event.status !== 'completed' && (
          <>
            {/* Start button */}
            {event.status === 'waiting' && (
              <button
                onClick={handleStartSession}
                disabled={loading || participants.length < 2}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm"
              >
                {loading ? 'Başlatılıyor...' : 'Oturumu Başlat'}
              </button>
            )}

            {/* Active controls */}
            {event.status === 'active' && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
                <div className="flex gap-3">
                  <button
                    onClick={handleTogglePause}
                    disabled={loading}
                    className={`flex-1 py-2.5 rounded-xl font-semibold text-sm transition disabled:opacity-50 disabled:cursor-not-allowed ${
                      event.paused
                        ? 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200'
                        : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                    }`}
                  >
                    {event.paused ? '▶ Devam Et' : '⏸ Duraklat'}
                  </button>
                  <button
                    onClick={handleCancelSession}
                    disabled={loading}
                    className="flex-1 py-2.5 bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 rounded-xl font-semibold text-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    ✕ İptal Et
                  </button>
                </div>

                {/* Progress bar */}
                {matches.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>Tur {event.currentRound} ilerleme</span>
                      <span>{completedMatchCount}/{matches.length} maç</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-500"
                        style={{ width: `${matches.length > 0 ? (completedMatchCount / matches.length) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Announcement */}
                <form onSubmit={handleSendAnnouncement} className="flex gap-2">
                  <input
                    type="text"
                    value={announcementText}
                    onChange={e => setAnnouncementText(e.target.value)}
                    placeholder="Tüm katılımcılara duyuru gönder..."
                    maxLength={200}
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-xl bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition text-sm"
                  />
                  <button
                    type="submit"
                    disabled={sendingAnnouncement || !announcementText.trim()}
                    className="px-4 py-2 bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition text-sm whitespace-nowrap"
                  >
                    {sendingAnnouncement ? '...' : '📢 Gönder'}
                  </button>
                </form>
              </div>
            )}

            {/* Participants */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100">
                <h2 className="font-semibold text-slate-900">Katılımcılar ({participants.length})</h2>
              </div>
              {participants.length === 0 ? (
                <p className="px-4 py-6 text-sm text-slate-400 text-center">Henüz katılımcı yok</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {participants.map(p => (
                    <li key={p.uid} className="flex items-center px-4 py-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-sm font-bold mr-3 shrink-0">
                        {p.displayName.charAt(0).toUpperCase()}
                      </div>
                      <span className="flex-1 text-sm font-medium text-slate-800">{p.displayName}</span>
                      {p.isReady && <span className="text-xs text-green-600 font-semibold">✓ Hazır</span>}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Waitlist */}
            {waitlist.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100">
                  <h2 className="font-semibold text-slate-900">Bekleme Listesi ({waitlist.length})</h2>
                </div>
                <ul className="divide-y divide-slate-100">
                  {waitlist.map(entry => (
                    <li key={entry.uid} className="flex items-center px-4 py-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-sm font-bold mr-3 shrink-0">
                        {entry.displayName.charAt(0).toUpperCase()}
                      </div>
                      <span className="flex-1 text-sm font-medium text-slate-800">{entry.displayName}</span>
                      {event.status === 'waiting' && (
                        <button
                          onClick={() => handleAdmitFromWaitlist(entry)}
                          className="px-3 py-1 bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 text-xs font-semibold rounded-lg transition"
                        >
                          Kabul Et
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Match rounds */}
            {allMatches.length > 0 && (() => {
              const rounds = Array.from(new Set(allMatches.map(m => m.round))).sort((a, b) => a - b);
              return rounds.map(round => {
                const roundMatches = allMatches.filter(m => m.round === round).sort((a, b) => a.tableNumber - b.tableNumber);
                const allDone = roundMatches.every(m => m.status === 'completed');
                const isCurrent = round === event.currentRound;
                return (
                  <div key={round} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                      <h2 className="font-semibold text-slate-900">Tur {round}</h2>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        allDone ? 'bg-green-100 text-green-700' :
                        isCurrent ? 'bg-blue-100 text-blue-700' :
                        'bg-slate-100 text-slate-500'
                      }`}>
                        {allDone ? 'Tamamlandı' : isCurrent ? 'Devam Ediyor' : 'Bekliyor'}
                      </span>
                    </div>
                    <ul className="divide-y divide-slate-100">
                      {roundMatches.map(match => (
                        <li key={match.matchId} className="px-4 py-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-slate-500">Masa {match.tableNumber}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              match.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                            }`}>
                              {match.status === 'completed' ? 'Tamamlandı' : 'Devam Ediyor'}
                            </span>
                          </div>
                          <p className="text-sm text-slate-700 mt-1">
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
      </main>
    </div>
  );
}
