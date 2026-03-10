'use client';

import { useAuth } from '../../../components/AuthProvider';
import { useEffect, useState } from 'react';
import { listenToEvent, listenToParticipants, listenToMatches, markMatchParticipantReady, completeMatch } from '../../../lib/firestore';
import { Event, Participant, SpeedMatch } from '../../../types';
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
            <SignOutButton />
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

        {event.status === 'completed' && (
          <div className="space-y-4 text-center">
            <div className="p-6 bg-gradient-to-r from-green-600 to-green-500 rounded border border-green-400 shadow-lg">
              <p className="text-white font-bold text-2xl">✨ Etkinlik Tamamlandı!</p>
              <p className="text-white text-lg mt-2">Herkes ile tanıştınız. Harika geçti!</p>              <p className="text-white text-md mt-2">Katılımınız için çok teşekkürler!</p>            </div>
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