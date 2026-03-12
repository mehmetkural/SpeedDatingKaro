'use client';

import { useAuth } from '../../../components/AuthProvider';
import { useEffect, useState } from 'react';
import { listenToEvent, listenToParticipants, listenToMatches, markMatchParticipantReady, completeMatch, submitRating, getMutualMatches, getUserProfile, getMyMatchHistory, listenToAnnouncements } from '../../../lib/firestore';
import { Event, Participant, SpeedMatch, AppUser, Announcement } from '../../../types';
import { useParams } from 'next/navigation';
import SignOutButton from '../../../components/SignOutButton';
import CountdownTimer from '../../../components/CountdownTimer';
import toast from 'react-hot-toast';
import { SkeletonStatGrid } from '../../../components/Skeleton';
import Link from 'next/link';

// ── helpers ──────────────────────────────────────────────────────────────────

function PageHeader({
  title, backHref, right, sub,
}: { title: string; backHref: string; right?: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-10 bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Link href={backHref} className="shrink-0 text-slate-400 hover:text-slate-700 transition text-sm font-medium">← Geri</Link>
          <div className="min-w-0">
            <h1 className="text-base font-bold text-slate-900 truncate">{title}</h1>
            {sub && <div className="text-xs text-slate-500">{sub}</div>}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">{right}</div>
      </div>
    </header>
  );
}

function AnnouncementBanner({ announcements, dismissed, onDismiss }: {
  announcements: Announcement[];
  dismissed: Set<string>;
  onDismiss: (id: string) => void;
}) {
  const active = announcements.filter(a => !dismissed.has(a.id)).slice(0, 1);
  if (active.length === 0) return null;
  return (
    <>
      {active.map(a => (
        <div key={a.id} className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-start gap-2">
          <span className="shrink-0">📢</span>
          <p className="flex-1 text-sm font-medium text-amber-800">{a.message}</p>
          <button onClick={() => onDismiss(a.id)} className="shrink-0 text-amber-400 hover:text-amber-700 text-lg leading-none">✕</button>
        </div>
      ))}
    </>
  );
}

// ── main component ────────────────────────────────────────────────────────────

export default function EventLobby() {
  const { appUser } = useAuth();
  const params = useParams();
  const eventId = params.eventId as string;
  const [event, setEvent] = useState<Event | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [currentMatch, setCurrentMatch] = useState<SpeedMatch | null>(null);
  const [matches, setMatches] = useState<SpeedMatch[]>([]);
  const [isReadyLoading, setIsReadyLoading] = useState(false);
  const [userReady, setUserReady] = useState(false);
  const [lastCompletedMatch, setLastCompletedMatch] = useState<SpeedMatch | null>(null);
  const [ratedMatchIds, setRatedMatchIds] = useState<Set<string>>(new Set());
  const [mutualMatches, setMutualMatches] = useState<string[]>([]);
  const [partnerProfile, setPartnerProfile] = useState<AppUser | null>(null);
  const [matchHistory, setMatchHistory] = useState<SpeedMatch[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [dismissedAnnouncements, setDismissedAnnouncements] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!eventId) return;
    const unsubscribeEvent = listenToEvent(eventId, setEvent);
    const unsubscribeParticipants = listenToParticipants(eventId, setParticipants);
    const unsubscribeAnnouncements = listenToAnnouncements(eventId, setAnnouncements);
    return () => { unsubscribeEvent(); unsubscribeParticipants(); unsubscribeAnnouncements(); };
  }, [eventId]);

  useEffect(() => {
    if (!eventId || !event || event.status !== 'active') return;
    const unsub = listenToMatches(eventId, event.currentRound, (matchData) => {
      setMatches(matchData);
      if (appUser) {
        const myMatch = matchData.find(m => m.participant1Uid === appUser.uid || m.participant2Uid === appUser.uid);
        setCurrentMatch(myMatch || null);
        if (myMatch) {
          const isP1 = myMatch.participant1Uid === appUser.uid;
          setUserReady(isP1 ? myMatch.participant1Ready : myMatch.participant2Ready);
        }
      }
    });
    return () => unsub();
  }, [eventId, event, appUser]);

  useEffect(() => {
    if (!currentMatch || !appUser) { setPartnerProfile(null); return; }
    const partnerUid = currentMatch.participant1Uid === appUser.uid ? currentMatch.participant2Uid : currentMatch.participant1Uid;
    getUserProfile(partnerUid).then(setPartnerProfile);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMatch?.matchId, appUser]);

  useEffect(() => {
    if (currentMatch?.status === 'completed') setLastCompletedMatch(currentMatch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMatch?.status, currentMatch?.matchId]);

  useEffect(() => {
    if (event?.status === 'completed' && appUser) {
      getMutualMatches(eventId, appUser.uid).then(setMutualMatches);
      getMyMatchHistory(eventId, appUser.uid).then(setMatchHistory);
    }
  }, [event?.status, eventId, appUser]);

  const handleRate = async (liked: boolean) => {
    if (!lastCompletedMatch || !appUser) return;
    const partnerUid = lastCompletedMatch.participant1Uid === appUser.uid ? lastCompletedMatch.participant2Uid : lastCompletedMatch.participant1Uid;
    try {
      await submitRating(eventId, { matchId: lastCompletedMatch.matchId, fromUid: appUser.uid, toUid: partnerUid, round: lastCompletedMatch.round, liked });
      setRatedMatchIds(prev => new Set([...prev, lastCompletedMatch.matchId]));
    } catch (err) {
      console.error('Error submitting rating:', err);
    }
  };

  const handleMarkReady = async () => {
    if (!currentMatch || !appUser) return;
    setIsReadyLoading(true);
    try {
      await markMatchParticipantReady(eventId, currentMatch.matchId, appUser.uid);
      setUserReady(true);
    } catch (err) {
      console.error('Error marking ready:', err);
      toast.error('Hazır durumu güncellenemedi');
    } finally {
      setIsReadyLoading(false);
    }
  };

  const handleTimeUp = async () => {
    if (!currentMatch) return;
    try { await completeMatch(eventId, currentMatch.matchId); }
    catch (err) { console.error('Error completing match:', err); }
  };

  const dismissAnnouncement = (id: string) =>
    setDismissedAnnouncements(prev => new Set([...prev, id]));

  // ── Loading ──
  if (!event) return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200 h-14" />
      <div className="max-w-2xl mx-auto px-4 py-6"><SkeletonStatGrid /></div>
    </div>
  );

  const roundLabel = event.totalRounds ? `Tur ${event.currentRound}/${event.totalRounds}` : `Tur ${event.currentRound}`;

  // ── Rating overlay ──
  const showRatingOverlay = lastCompletedMatch && !ratedMatchIds.has(lastCompletedMatch.matchId);
  if (showRatingOverlay) {
    const ratingPartnerName = participants.find(p => p.uid === (
      lastCompletedMatch.participant1Uid === appUser?.uid ? lastCompletedMatch.participant2Uid : lastCompletedMatch.participant1Uid
    ))?.displayName || 'Eşiniz';
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-sm w-full space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center">
            <div className="text-5xl mb-4">💫</div>
            <h2 className="text-xl font-bold text-slate-900 mb-1">Tur {lastCompletedMatch.round} bitti!</h2>
            <p className="text-slate-500 mb-6">
              <span className="font-semibold text-slate-700">{ratingPartnerName}</span> ile tanışmak nasıldı?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => handleRate(true)}
                className="flex-1 py-3 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-bold rounded-xl hover:from-pink-600 hover:to-rose-600 transition shadow-sm text-lg"
              >
                ❤️ Beğendim
              </button>
              <button
                onClick={() => handleRate(false)}
                className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition text-lg"
              >
                👋 Geçtim
              </button>
            </div>
          </div>
          <button
            onClick={() => setRatedMatchIds(prev => new Set([...prev, lastCompletedMatch.matchId]))}
            className="w-full text-slate-400 hover:text-slate-600 text-sm py-2 transition"
          >
            Atla
          </button>
        </div>
      </div>
    );
  }

  // ── Bye round ──
  if (event.status === 'active' && !currentMatch && matches.length > 0) {
    return (
      <div className="min-h-screen bg-slate-50">
        <PageHeader title={event.title} backHref="/participant" sub={roundLabel} right={<SignOutButton />} />
        <main className="max-w-2xl mx-auto px-4 py-12 text-center">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-10">
            <div className="text-5xl mb-4">☕</div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Bu Tur Dinlenme Turunuz</h2>
            <p className="text-slate-500">Katılımcı sayısı tek olduğundan bu turda eşleşmeniz yok.</p>
            <p className="text-slate-400 text-sm mt-3">Bir sonraki tur başlayana kadar bekleyin...</p>
          </div>
        </main>
      </div>
    );
  }

  // ── Match view ──
  if (event.status === 'active' && currentMatch) {
    const partnerUid = currentMatch.participant1Uid === appUser?.uid ? currentMatch.participant2Uid : currentMatch.participant1Uid;
    const partnerName = participants.find(p => p.uid === partnerUid)?.displayName || 'Bilinmeyen';
    const partnerReady = currentMatch.participant1Uid === appUser?.uid ? currentMatch.participant2Ready : currentMatch.participant1Ready;

    return (
      <div className="min-h-screen bg-slate-50">
        <PageHeader title={event.title} backHref="/participant" sub={roundLabel} right={<SignOutButton />} />
        <AnnouncementBanner announcements={announcements} dismissed={dismissedAnnouncements} onDismiss={dismissAnnouncement} />

        <main className="max-w-2xl mx-auto px-4 py-5 space-y-4">
          {/* Timer */}
          <CountdownTimer
            sessionStartedAt={currentMatch.sessionStartedAt}
            sessionDurationSeconds={event.sessionDurationSeconds}
            onTimeUp={handleTimeUp}
            paused={event.paused}
            pauseAccumulatedSeconds={event.pauseAccumulatedSeconds}
          />

          {/* Table badge */}
          <div className="flex items-center justify-center">
            <div className="px-5 py-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full text-white font-semibold text-sm shadow-sm">
              Masa {currentMatch.tableNumber}
            </div>
          </div>

          {/* You */}
          <div className={`bg-white rounded-2xl border-2 shadow-sm p-5 transition-colors ${userReady ? 'border-green-300' : 'border-amber-300'}`}>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">Siz</p>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold shrink-0">
                  {appUser?.displayName?.charAt(0).toUpperCase()}
                </div>
                <p className="font-semibold text-slate-900">{appUser?.displayName}</p>
              </div>
              {userReady ? (
                <span className="text-green-600 text-sm font-semibold">✓ Hazır</span>
              ) : (
                <button
                  onClick={handleMarkReady}
                  disabled={isReadyLoading}
                  className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white text-sm font-semibold rounded-xl disabled:opacity-50 transition shadow-sm"
                >
                  {isReadyLoading ? '...' : 'Hazırım ✓'}
                </button>
              )}
            </div>
          </div>

          {/* vs divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-slate-400 text-sm font-semibold">vs</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          {/* Partner */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">Eşiniz</p>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center text-white font-bold shrink-0">
                  {partnerName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-slate-900">{partnerName}</p>
                  {partnerProfile?.interests && (
                    <p className="text-xs text-slate-500">🎯 {partnerProfile.interests}</p>
                  )}
                </div>
              </div>
              <span className={`text-sm font-semibold ${partnerReady ? 'text-green-600' : 'text-amber-500'}`}>
                {partnerReady ? '✓ Hazır' : '⏳ Bekliyor'}
              </span>
            </div>
            {partnerProfile?.bio && (
              <p className="text-sm text-slate-500 mt-3 italic border-t border-slate-100 pt-3">&ldquo;{partnerProfile.bio}&rdquo;</p>
            )}
          </div>

          {currentMatch.status === 'completed' && (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-center">
              <p className="text-green-700 font-semibold">✓ Tur tamamlandı! Sonraki tur bekleniyor...</p>
            </div>
          )}
        </main>
      </div>
    );
  }

  // ── Waiting room ──
  const statusColors: Record<string, string> = {
    waiting: 'bg-amber-100 text-amber-700',
    active: 'bg-green-100 text-green-700',
    completed: 'bg-slate-100 text-slate-600',
  };
  const statusLabels: Record<string, string> = {
    waiting: 'Bekleniyor', active: 'Aktif', completed: 'Tamamlandı',
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader title={event.title} backHref="/participant" right={<SignOutButton />} />
      <AnnouncementBanner announcements={announcements} dismissed={dismissedAnnouncements} onDismiss={dismissAnnouncement} />

      <main className="max-w-2xl mx-auto px-4 py-5 space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Durum', value: statusLabels[event.status], extra: statusColors[event.status] },
            { label: 'Tur', value: event.currentRound + (event.totalRounds ? `/${event.totalRounds}` : '') },
            { label: 'Masalar', value: event.tableCount },
            { label: 'Süre/Tur', value: `${event.sessionDurationSeconds / 60} dk` },
          ].map(({ label, value, extra }) => (
            <div key={label} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">{label}</p>
              {extra ? (
                <span className={`inline-block px-2 py-0.5 rounded-full text-sm font-semibold ${extra}`}>{value}</span>
              ) : (
                <p className="text-2xl font-bold text-slate-900">{value}</p>
              )}
            </div>
          ))}
        </div>

        {/* Participants */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900">Katılımcılar <span className="text-slate-400 font-normal">({participants.length})</span></h2>
          </div>
          <ul className="divide-y divide-slate-100">
            {participants.map(p => (
              <li key={p.uid} className="flex items-center px-4 py-3 gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-sm font-bold shrink-0">
                  {p.displayName.charAt(0).toUpperCase()}
                </div>
                <span className="flex-1 font-medium text-slate-800">{p.displayName}</span>
                {p.isReady && <span className="text-green-600 text-xs font-semibold">✓ Hazır</span>}
              </li>
            ))}
          </ul>
        </div>

        {/* Status messages */}
        {event.status === 'waiting' && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center">
            <p className="text-amber-800 font-medium">⏳ Moderatör oturumu başlatması bekleniyor...</p>
          </div>
        )}
        {event.status === 'active' && !currentMatch && matches.length === 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-center">
            <p className="text-blue-700 font-medium">⏳ Tur başlatılıyor, lütfen bekleyin...</p>
          </div>
        )}

        {/* Completion */}
        {event.status === 'completed' && (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center">
              <div className="text-4xl mb-2">✨</div>
              <h2 className="text-xl font-bold text-green-900 mb-1">Etkinlik Tamamlandı!</h2>
              <p className="text-green-700">Herkes ile tanıştınız. Harika geçti!</p>
              <p className="text-green-600 text-sm mt-1">Katılımınız için teşekkürler!</p>
            </div>

            {mutualMatches.length > 0 && (
              <div className="bg-white rounded-2xl border-2 border-pink-200 shadow-sm overflow-hidden">
                <div className="px-4 py-3 bg-pink-50 border-b border-pink-200">
                  <h3 className="font-bold text-pink-800">💞 Karşılıklı Eşleşmeler</h3>
                  <p className="text-xs text-pink-600 mt-0.5">Bu kişiler de sizi beğendi</p>
                </div>
                <ul className="divide-y divide-pink-100">
                  {mutualMatches.map(uid => {
                    const name = participants.find(p => p.uid === uid)?.displayName || uid.slice(0, 8);
                    return (
                      <li key={uid} className="flex items-center gap-3 px-4 py-3">
                        <span className="text-rose-500">❤️</span>
                        <span className="font-semibold text-slate-900">{name}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {matchHistory.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100">
                  <h3 className="font-semibold text-slate-900">📋 Eşleşme Geçmişi</h3>
                </div>
                <ul className="divide-y divide-slate-100">
                  {matchHistory.map(m => {
                    const pUid = m.participant1Uid === appUser?.uid ? m.participant2Uid : m.participant1Uid;
                    const pName = participants.find(p => p.uid === pUid)?.displayName || pUid.slice(0, 8);
                    const isMutual = mutualMatches.includes(pUid);
                    return (
                      <li key={m.matchId} className="flex items-center justify-between px-4 py-3">
                        <span className="text-slate-700 font-medium">Tur {m.round} — {pName}</span>
                        {isMutual && <span className="text-pink-500 text-sm">❤️ Match</span>}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            <Link
              href="/participant"
              className="block w-full py-3 text-center bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-purple-700 transition shadow-sm"
            >
              ← Ana Menüye Dön
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
