'use client';

import { useAuth } from '../../../components/AuthProvider';
import { useEffect, useState } from 'react';
import { listenToEvent, listenToParticipants, listenToMatches, markMatchParticipantReady, completeMatch, submitRating, getMutualMatches, getUserProfile } from '../../../lib/firestore';
import { Event, Participant, SpeedMatch, AppUser } from '../../../types';
import { useParams } from 'next/navigation';
import SignOutButton from '../../../components/SignOutButton';
import CountdownTimer from '../../../components/CountdownTimer';

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

  useEffect(() => {
    if (!eventId) return;

    const unsubscribeEvent = listenToEvent(eventId, setEvent);
    const unsubscribeParticipants = listenToParticipants(eventId, setParticipants);

    return () => {
      unsubscribeEvent();
      unsubscribeParticipants();
    };
  }, [eventId]);

  // Listen to matches when event is active
  useEffect(() => {
    if (!eventId || !event || event.status !== 'active') return;

    const unsubscribeMatches = listenToMatches(eventId, event.currentRound, (matchData) => {
      setMatches(matchData);
      
      // Find current user's match
      if (appUser) {
        const myMatch = matchData.find(
          m => m.participant1Uid === appUser.uid || m.participant2Uid === appUser.uid
        );
        setCurrentMatch(myMatch || null);
        
        // Debug: Check sessionStartedAt
        if (myMatch) {
          console.log('Match found - sessionStartedAt:', myMatch.sessionStartedAt, 'Round:', myMatch.round);
        }
        
        // Update user's ready status from match
        if (myMatch) {
          const isParticipant1 = myMatch.participant1Uid === appUser.uid;
          setUserReady(isParticipant1 ? myMatch.participant1Ready : myMatch.participant2Ready);
        }
      }
    });

    return () => unsubscribeMatches();
  }, [eventId, event, appUser]);

  // Load partner profile when match changes
  useEffect(() => {
    if (!currentMatch || !appUser) { setPartnerProfile(null); return; }
    const partnerUid = currentMatch.participant1Uid === appUser.uid
      ? currentMatch.participant2Uid
      : currentMatch.participant1Uid;
    getUserProfile(partnerUid).then(setPartnerProfile);
  }, [currentMatch?.matchId, appUser]);

  // Track last completed match for rating overlay
  useEffect(() => {
    if (currentMatch?.status === 'completed') {
      setLastCompletedMatch(currentMatch);
    }
  }, [currentMatch?.status, currentMatch?.matchId]);

  // Load mutual matches when event completes
  useEffect(() => {
    if (event?.status === 'completed' && appUser) {
      getMutualMatches(eventId, appUser.uid).then(setMutualMatches);
    }
  }, [event?.status, eventId, appUser]);

  const handleRate = async (liked: boolean) => {
    if (!lastCompletedMatch || !appUser) return;
    const partnerUid = lastCompletedMatch.participant1Uid === appUser.uid
      ? lastCompletedMatch.participant2Uid
      : lastCompletedMatch.participant1Uid;
    try {
      await submitRating(eventId, {
        matchId: lastCompletedMatch.matchId,
        fromUid: appUser.uid,
        toUid: partnerUid,
        round: lastCompletedMatch.round,
        liked,
      });
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
      alert('Hata: Hazır durumu güncellenemedi');
    } finally {
      setIsReadyLoading(false);
    }
  };

  const handleTimeUp = async () => {
    if (!currentMatch) return;
    try {
      await completeMatch(eventId, currentMatch.matchId);
    } catch (err) {
      console.error('Error completing match:', err);
    }
  };

  if (!event) return <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center text-white text-lg">Yükleniyor...</div>;

  // Rating overlay — shown when last match completed but not yet rated
  const showRatingOverlay = lastCompletedMatch && !ratedMatchIds.has(lastCompletedMatch.matchId);
  const ratingPartnerName = lastCompletedMatch
    ? participants.find(p => p.uid === (lastCompletedMatch.participant1Uid === appUser?.uid ? lastCompletedMatch.participant2Uid : lastCompletedMatch.participant1Uid))?.displayName || 'Eşiniz'
    : '';

  if (showRatingOverlay) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="p-8 bg-gradient-to-br from-purple-900 to-purple-800 rounded-xl border-2 border-purple-500 shadow-xl">
            <p className="text-4xl mb-4">💫</p>
            <h2 className="text-2xl font-bold text-white mb-2">Tur {lastCompletedMatch.round} Tamamlandı!</h2>
            <p className="text-purple-200 text-lg mb-6"><span className="font-bold text-white">{ratingPartnerName}</span> ile geçen dakikalar nasıldı?</p>
            <div className="flex gap-4">
              <button
                onClick={() => handleRate(true)}
                className="flex-1 py-4 text-2xl bg-gradient-to-r from-pink-500 to-rose-500 rounded-xl font-bold hover:from-pink-600 hover:to-rose-600 transition shadow-lg"
              >
                ❤️ Beğendim
              </button>
              <button
                onClick={() => handleRate(false)}
                className="flex-1 py-4 text-2xl bg-gradient-to-r from-gray-600 to-gray-700 rounded-xl font-bold hover:from-gray-700 hover:to-gray-800 transition shadow-lg"
              >
                👋 Geçtim
              </button>
            </div>
          </div>
          <button
            onClick={() => setRatedMatchIds(prev => new Set([...prev, lastCompletedMatch.matchId]))}
            className="text-gray-400 hover:text-gray-200 text-sm underline transition"
          >
            Atla
          </button>
        </div>
      </div>
    );
  }

  // Bye round — session active but user has no match this round
  if (event.status === 'active' && !currentMatch && matches.length > 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white p-4">
        <div className="max-w-2xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">{event.title}</h1>
            <div className="flex items-center gap-3">
              <span className="text-lg font-bold text-purple-300">Tur {event.currentRound}{event.totalRounds ? `/${event.totalRounds}` : ''}</span>
              <SignOutButton />
            </div>
          </div>
          <div className="text-center p-10 bg-gradient-to-br from-indigo-900 to-indigo-800 rounded-xl border-2 border-indigo-500 shadow-xl">
            <p className="text-5xl mb-4">☕</p>
            <h2 className="text-2xl font-bold text-white mb-2">Bu Tur Dinlenme Turunuz</h2>
            <p className="text-indigo-200 text-lg">Katılımcı sayısı tek olduğundan bu turda eşleşmeniz yok.</p>
            <p className="text-indigo-300 text-sm mt-4">Bir sonraki tur başlayana kadar bekleyin...</p>
          </div>
        </div>
      </div>
    );
  }

  // Match view when session is active
  if (event.status === 'active' && currentMatch) {
    const partnerUid = currentMatch.participant1Uid === appUser?.uid 
      ? currentMatch.participant2Uid 
      : currentMatch.participant1Uid;
    
    const partnerName = participants.find(p => p.uid === partnerUid)?.displayName || 'Bilinmeyen';

    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white p-4">
        <div className="max-w-2xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">{event.title}</h1>
            <div className="flex items-center gap-3">
              <span className="text-lg font-bold text-purple-300">Tur {event.currentRound}{event.totalRounds ? `/${event.totalRounds}` : ''}</span>
              <SignOutButton />
            </div>
          </div>

          {/* Timer */}
          <div className="mb-6">
            <CountdownTimer 
              sessionStartedAt={currentMatch.sessionStartedAt}
              sessionDurationSeconds={event.sessionDurationSeconds}
              onTimeUp={handleTimeUp}
            />
          </div>

          {/* Match Info */}
          <div className="space-y-6">
            {/* Your Info */}
            <div className={`p-6 rounded border-2 shadow-lg ${
              userReady 
                ? 'bg-gradient-to-br from-green-900 to-green-800 border-green-500' 
                : 'bg-gradient-to-br from-yellow-900 to-yellow-800 border-yellow-500'
            }`}>
              <p className={`text-sm mb-2 ${userReady ? 'text-green-300' : 'text-yellow-300'}`}>Sizin Bilgileriniz</p>
              <p className="text-2xl font-bold text-white">{appUser?.displayName}</p>
              
              {!userReady ? (
                <button
                  onClick={handleMarkReady}
                  disabled={isReadyLoading}
                  className="mt-4 w-full bg-gradient-to-r from-green-500 to-green-600 text-white font-bold py-2 rounded hover:from-green-600 hover:to-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  {isReadyLoading ? '⏳ Işaretleniyor...' : '✓ Hazırım!'}
                </button>
              ) : (
                <p className="text-sm text-green-300 mt-4 font-bold">✓ Hazır olarak işaretlendiniz</p>
              )}
            </div>

            {/* VS */}
            <div className="text-center">
              <p className="text-3xl font-bold text-gray-400">vs</p>
            </div>

            {/* Partner Info */}
            <div className="p-6 bg-gradient-to-br from-blue-900 to-blue-800 rounded border-2 border-blue-500 shadow-lg">
              <p className="text-sm text-blue-300 mb-2">Eşinizin Bilgileri</p>
              <p className="text-2xl font-bold text-white">{partnerName}</p>
              {partnerProfile?.bio && (
                <p className="text-sm text-blue-200 mt-2 italic">&ldquo;{partnerProfile.bio}&rdquo;</p>
              )}
              {partnerProfile?.interests && (
                <p className="text-xs text-blue-300 mt-1">🎯 {partnerProfile.interests}</p>
              )}
              <p className={`text-sm mt-2 ${
                (currentMatch.participant1Uid === appUser?.uid ? currentMatch.participant2Ready : currentMatch.participant1Ready)
                  ? 'text-blue-300'
                  : 'text-yellow-300'
              }`}>
                {(currentMatch.participant1Uid === appUser?.uid ? currentMatch.participant2Ready : currentMatch.participant1Ready)
                  ? '✓ Hazır'
                  : '⏳ Bekleniyor'}
              </p>
            </div>

            {/* Table Number */}
            <div className="text-center p-6 bg-gradient-to-r from-purple-600 to-purple-700 rounded border border-purple-400">
              <p className="text-sm text-purple-300 mb-2">Masa Numaranız</p>
              <p className="text-5xl font-bold text-white">{currentMatch.tableNumber}</p>
            </div>

            {/* Status */}
            <div className={`text-center p-6 rounded border-2 shadow-lg ${
              currentMatch.status === 'completed'
                ? 'bg-gradient-to-r from-green-600 to-green-500 border-green-400'
                : 'bg-gradient-to-r from-yellow-600 to-yellow-500 border-yellow-400'
            }`}>
              <p className="text-white font-bold text-lg">
                {currentMatch.status === 'completed' ? '✓ Maç Tamamlandı!' : '🕐 Maç Devam Ediyor'}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Waiting room view
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white p-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">{event.title}</h1>
          <SignOutButton />
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="p-4 bg-gradient-to-br from-blue-400 to-blue-500 rounded shadow-md">
            <p className="text-sm text-white/80">Durum</p>
            <p className="text-2xl font-bold text-white capitalize">{event.status === 'waiting' ? 'Bekleniyor' : event.status === 'active' ? 'Aktif' : 'Tamamlandı'}</p>
          </div>
          <div className="p-4 bg-gradient-to-br from-purple-400 to-purple-500 rounded shadow-md">
            <p className="text-sm text-white/80">Tur</p>
            <p className="text-2xl font-bold text-white">
              {event.currentRound}{event.totalRounds ? `/${event.totalRounds}` : ''}
            </p>
          </div>
          <div className="p-4 bg-gradient-to-br from-green-400 to-green-500 rounded shadow-md">
            <p className="text-sm text-white/80">Masalar</p>
            <p className="text-2xl font-bold text-white">{event.tableCount}</p>
          </div>
          <div className="p-4 bg-gradient-to-br from-orange-400 to-orange-500 rounded shadow-md">
            <p className="text-sm text-white/80">Süre</p>
            <p className="text-2xl font-bold text-white">{event.sessionDurationSeconds / 60}dk</p>
          </div>
        </div>

        <h2 className="text-2xl font-bold mb-4 text-white border-b border-gray-700 pb-2">Katılımcılar ({participants.length})</h2>
        <ul className="space-y-2 mb-6">
          {participants.map(p => (
            <li key={p.uid} className="flex items-center p-3 bg-gray-800 rounded border border-gray-700 hover:bg-gray-700 transition">
              <span className="flex-1 font-semibold text-white">{p.displayName}</span>
              {p.isReady && <span className="text-green-400 font-bold">✓ Hazır</span>}
            </li>
          ))}
        </ul>

        {event.status === 'waiting' && (
          <div className="text-center p-6 bg-gradient-to-r from-yellow-600 to-yellow-500 rounded border border-yellow-400 shadow-lg">
            <p className="text-white font-bold text-lg">⏳ Moderatör oturumu başlatması bekleniyor...</p>
          </div>
        )}

        {event.status === 'active' && !currentMatch && matches.length === 0 && (
          <div className="text-center p-6 bg-gradient-to-r from-blue-600 to-blue-500 rounded border border-blue-400 shadow-lg">
            <p className="text-white font-bold text-lg">⏳ Tur başlatılıyor, lütfen bekleyin...</p>
          </div>
        )}

        {event.status === 'completed' && (
          <div className="space-y-4 text-center">
            <div className="p-6 bg-gradient-to-r from-green-600 to-green-500 rounded border border-green-400 shadow-lg">
              <p className="text-white font-bold text-2xl">✨ Etkinlik Tamamlandı!</p>
              <p className="text-white text-lg mt-2">Herkes ile tanıştınız. Harika geçti!</p>
              <p className="text-white text-md mt-2">Katılımınız için çok teşekkürler!</p>
            </div>

            {mutualMatches.length > 0 && (
              <div className="p-6 bg-gradient-to-br from-pink-900 to-rose-900 rounded border-2 border-pink-500 shadow-lg">
                <p className="text-2xl font-bold text-white mb-1">💞 Karşılıklı Eşleşmeler!</p>
                <p className="text-pink-200 text-sm mb-4">Bu kişiler de sizi beğendi:</p>
                <ul className="space-y-2">
                  {mutualMatches.map(uid => {
                    const name = participants.find(p => p.uid === uid)?.displayName || uid.slice(0, 8);
                    return (
                      <li key={uid} className="py-2 px-4 bg-pink-800/50 rounded-lg font-bold text-white">
                        ❤️ {name}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            <a
              href="/participant"
              className="block w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 rounded font-bold hover:from-blue-600 hover:to-blue-700 transition shadow-lg"
            >
              ← Ana Menüye Dön
            </a>
          </div>
        )}
      </div>
    </div>
  );
}