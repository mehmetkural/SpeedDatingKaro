import { db } from './firebase';
import { collection, doc, getDocs, getDoc, addDoc, updateDoc, deleteDoc, setDoc, onSnapshot, query, where, orderBy, writeBatch, serverTimestamp, DocumentData } from 'firebase/firestore';
import { Event, Participant, SpeedMatch, AppUser, MatchRating, Announcement, WaitlistEntry } from '../types';
import { v4 as uuidv4 } from 'uuid';

// Matching Algorithm — round-robin circle method
// Even n: n-1 rounds, n/2 matches per round (everyone plays everyone)
// Odd n:  n rounds,   (n-1)/2 matches per round (one bye per round)
export const generateMatches = async (eventId: string, tableCount: number): Promise<{ allPaired: boolean }> => {
  const event = await getEvent(eventId);
  if (!event) throw new Error('Event not found');

  const participants = await getEventParticipants(eventId);
  if (participants.length < 2) throw new Error('At least 2 participants required');

  const n = participants.length;
  const roundNumber = event.currentRound + 1;

  // Add a null "bye" slot for odd counts so the list length is always even
  const list: (Participant | null)[] = n % 2 === 0
    ? [...participants]
    : [...participants, null];
  const m = list.length;           // always even
  const totalRounds = m - 1;       // n-1 for even, n for odd

  // Fix list[0], rotate list[1..m-1] one step per round
  const fixed = list[0];
  const rotating = list.slice(1);  // length = m-1
  const rotLen = rotating.length;
  const roundIndex = (roundNumber - 1) % totalRounds;

  const rotated = [
    ...rotating.slice(roundIndex),
    ...rotating.slice(0, roundIndex),
  ];

  // Pairs: fixed ↔ rotated[last], then rotated[i] ↔ rotated[rotLen-2-i]
  const pairs: [Participant, Participant][] = [];

  if (fixed && rotated[rotLen - 1]) {
    pairs.push([fixed as Participant, rotated[rotLen - 1] as Participant]);
  }
  for (let i = 0; i < Math.floor(rotLen / 2); i++) {
    const pa = rotated[i];
    const pb = rotated[rotLen - 2 - i];
    if (pa && pb) pairs.push([pa as Participant, pb as Participant]);
  }

  const matches: SpeedMatch[] = pairs.map(([p1, p2], idx) => ({
    matchId: uuidv4(),
    round: roundNumber,
    tableNumber: (idx % tableCount) + 1,
    participant1Uid: p1.uid,
    participant2Uid: p2.uid,
    participant1Ready: false,
    participant2Ready: false,
    sessionStartedAt: null,
    sessionEndedAt: null,
    status: 'in_progress',
  }));

  const batch = writeBatch(db);

  matches.forEach(match => {
    const docRef = doc(db, 'events', eventId, 'matches', match.matchId);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { sessionStartedAt: _s, sessionEndedAt: _e, ...rest } = match;
    batch.set(docRef, { ...rest, sessionStartedAt: null, sessionEndedAt: null });
  });

  const eventRef = doc(db, 'events', eventId);
  batch.update(eventRef, {
    status: 'active',
    currentRound: roundNumber,
    totalRounds,
    sessionStartedAt: serverTimestamp(),
  });

  await batch.commit();

  return { allPaired: roundNumber >= totalRounds };
};

// Common
const mapEvent = (id: string, data: DocumentData): Event => ({
  ...data,
  eventId: id,
  createdAt: data.createdAt?.toDate?.() || new Date(),
  scheduledAt: data.scheduledAt?.toDate?.() || null,
} as Event);

export const getEvent = async (eventId: string): Promise<Event | null> => {
  const docSnap = await getDoc(doc(db, 'events', eventId));
  if (docSnap.exists()) return mapEvent(docSnap.id, docSnap.data());
  return null;
};

export const getEventParticipants = async (eventId: string): Promise<Participant[]> => {
  const querySnapshot = await getDocs(collection(db, 'events', eventId, 'participants'));
  return querySnapshot.docs.map(doc => ({
    ...doc.data(),
    joinedAt: doc.data().joinedAt?.toDate() || new Date()
  } as Participant));
};

export const getPastMatches = async (eventId: string): Promise<SpeedMatch[]> => {
  const querySnapshot = await getDocs(collection(db, 'events', eventId, 'matches'));
  return querySnapshot.docs.map(doc => ({
    ...doc.data(),
    sessionStartedAt: doc.data().sessionStartedAt?.toDate() || null,
    sessionEndedAt: doc.data().sessionEndedAt?.toDate() || null
  } as SpeedMatch));
};

export const listenToMatches = (eventId: string, round: number, callback: (matches: SpeedMatch[]) => void) => {
  const q = query(collection(db, 'events', eventId, 'matches'), where('round', '==', round));
  return onSnapshot(q, (querySnapshot) => {
    const matches = querySnapshot.docs.map(doc => ({
      ...doc.data(),
      sessionStartedAt: doc.data().sessionStartedAt?.toDate() || null,
      sessionEndedAt: doc.data().sessionEndedAt?.toDate() || null
    } as SpeedMatch));
    callback(matches);
  });
};

export const listenToAllMatches = (eventId: string, callback: (matches: SpeedMatch[]) => void) => {
  return onSnapshot(collection(db, 'events', eventId, 'matches'), (querySnapshot) => {
    const matches = querySnapshot.docs.map(doc => ({
      ...doc.data(),
      sessionStartedAt: doc.data().sessionStartedAt?.toDate() || null,
      sessionEndedAt: doc.data().sessionEndedAt?.toDate() || null
    } as SpeedMatch));
    callback(matches);
  });
};

export const listenToEvent = (eventId: string, callback: (event: Event) => void) => {
  return onSnapshot(doc(db, 'events', eventId), (snap) => {
    if (snap.exists()) callback(mapEvent(snap.id, snap.data()));
  });
};

export const listenToParticipants = (eventId: string, callback: (participants: Participant[]) => void) => {
  return onSnapshot(collection(db, 'events', eventId, 'participants'), (querySnapshot) => {
    const participants = querySnapshot.docs.map(doc => ({
      ...doc.data(),
      joinedAt: doc.data().joinedAt?.toDate() || new Date()
    } as Participant));
    callback(participants);
  });
};

// Admin
export const getAllUsers = async (): Promise<AppUser[]> => {
  const querySnapshot = await getDocs(collection(db, 'users'));
  return querySnapshot.docs.map(doc => ({
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate() || new Date()
  } as AppUser));
};

export const updateUserRole = async (uid: string, role: string) => {
  await updateDoc(doc(db, 'users', uid), { role });
};

export const updateUserProfile = async (uid: string, data: { bio?: string; interests?: string; displayName?: string }) => {
  await setDoc(doc(db, 'users', uid), data, { merge: true });
};

export const getUserProfile = async (uid: string): Promise<AppUser | null> => {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return null;
  const data = snap.data();
  return { ...data, createdAt: data.createdAt?.toDate() || new Date() } as AppUser;
};

export interface EventStats {
  totalMatches: number;
  completedMatches: number;
  completionRate: number;
  avgMatchDurationSeconds: number | null;
  totalParticipants: number;
}

export const getEventStats = async (eventId: string): Promise<EventStats> => {
  const [matchesSnap, participantsSnap] = await Promise.all([
    getDocs(collection(db, 'events', eventId, 'matches')),
    getDocs(collection(db, 'events', eventId, 'participants')),
  ]);

  const matches = matchesSnap.docs.map(d => d.data());
  const totalMatches = matches.length;
  const completedMatches = matches.filter(m => m.status === 'completed').length;

  const durations = matches
    .filter(m => m.sessionStartedAt && m.sessionEndedAt)
    .map(m => (m.sessionEndedAt.toDate().getTime() - m.sessionStartedAt.toDate().getTime()) / 1000);

  const avgMatchDurationSeconds = durations.length > 0
    ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
    : null;

  return {
    totalMatches,
    completedMatches,
    completionRate: totalMatches > 0 ? Math.round((completedMatches / totalMatches) * 100) : 0,
    avgMatchDurationSeconds,
    totalParticipants: participantsSnap.size,
  };
};

export const getAllEvents = async (): Promise<Event[]> => {
  const querySnapshot = await getDocs(collection(db, 'events'));
  return querySnapshot.docs.map(d => mapEvent(d.id, d.data()));
};

// Moderator
export const createEvent = async (event: Omit<Event, 'eventId' | 'createdAt'>) => {
  const docRef = await addDoc(collection(db, 'events'), {
    ...event,
    createdAt: serverTimestamp()
  });
  return docRef.id;
};

export const getMyEvents = async (moderatorUid: string): Promise<Event[]> => {
  const q = query(collection(db, 'events'), where('createdBy', '==', moderatorUid), orderBy('createdAt', 'desc'));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(d => mapEvent(d.id, d.data()));
};

export const deleteEvent = async (eventId: string) => {
  // Delete all sub-collections first, then the event document
  const subcollections = ['participants', 'matches', 'ratings', 'announcements', 'waitlist'];

  for (const sub of subcollections) {
    const snap = await getDocs(collection(db, 'events', eventId, sub));
    if (snap.empty) continue;
    const batch = writeBatch(db);
    snap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
  }

  await deleteDoc(doc(db, 'events', eventId));
};

// Participant
export const getOpenEvents = async (): Promise<Event[]> => {
  const q = query(collection(db, 'events'), where('status', 'in', ['waiting', 'active']), orderBy('createdAt', 'desc'));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(d => mapEvent(d.id, d.data()));
};

export const joinEvent = async (eventId: string, participant: Omit<Participant, 'joinedAt'>): Promise<{ waitlisted: boolean }> => {
  const event = await getEvent(eventId);
  if (!event) throw new Error('Event not found');

  if (event.maxParticipants) {
    const existingSnap = await getDocs(collection(db, 'events', eventId, 'participants'));
    if (existingSnap.size >= event.maxParticipants) {
      await joinWaitlist(eventId, { uid: participant.uid, displayName: participant.displayName });
      return { waitlisted: true };
    }
  }

  await setDoc(doc(db, 'events', eventId, 'participants', participant.uid), {
    ...participant,
    joinedAt: serverTimestamp(),
  });
  return { waitlisted: false };
};

// Update participant ready status
export const markParticipantReady = async (eventId: string, participantUid: string, isReady: boolean) => {
  await setDoc(doc(db, 'events', eventId, 'participants', participantUid), {
    isReady
  }, { merge: true });
};

// Update match - mark participant as ready
export const markMatchParticipantReady = async (eventId: string, matchId: string, participantUid: string) => {
  const matchRef = doc(db, 'events', eventId, 'matches', matchId);
  const matchSnap = await getDoc(matchRef);
  
  if (!matchSnap.exists()) return;
  
  const match = matchSnap.data();
  const isParticipant1 = match.participant1Uid === participantUid;
  
  type ReadyUpdate = { participant1Ready?: boolean; participant2Ready?: boolean; sessionStartedAt?: ReturnType<typeof serverTimestamp> };
  const updateData: ReadyUpdate = {
    [isParticipant1 ? 'participant1Ready' : 'participant2Ready']: true
  };

  // Check if both participants are ready
  const bothReady = isParticipant1 ? match.participant2Ready : match.participant1Ready;
  if (bothReady) {
    updateData.sessionStartedAt = serverTimestamp();
  }
  
  await setDoc(matchRef, updateData, { merge: true });
};

// Mark match as completed
export const completeMatch = async (eventId: string, matchId: string) => {
  await setDoc(doc(db, 'events', eventId, 'matches', matchId), {
    status: 'completed',
    sessionEndedAt: serverTimestamp()
  }, { merge: true });
};

// Auto-advance to next round or complete event
export const checkAndAdvanceRound = async (eventId: string, round: number) => {
  const event = await getEvent(eventId);
  if (!event || event.currentRound !== round) return;

  // Get all matches for current round
  const q = query(collection(db, 'events', eventId, 'matches'), where('round', '==', round));
  const querySnapshot = await getDocs(q);
  const roundMatches = querySnapshot.docs.map(d => ({
    ...d.data(),
    matchId: d.id,
  } as SpeedMatch));

  // Check if all matches are completed
  const allCompleted = roundMatches.length > 0 && roundMatches.every(m => m.status === 'completed');
  if (!allCompleted) return;

  // Calculate if all possible pairs exhausted
  const participants = await getEventParticipants(eventId);
  const totalPossiblePairs = participants.length * (participants.length - 1) / 2;
  
  // Get all historical matches
  const allMatchesSnapshot = await getDocs(collection(db, 'events', eventId, 'matches'));
  const completedMatchCount = allMatchesSnapshot.docs.filter(
    doc => doc.data().status === 'completed'
  ).length;

  const allPaired = completedMatchCount >= totalPossiblePairs;

  const eventRef = doc(db, 'events', eventId);
  
  if (allPaired) {
    // Complete event
    await setDoc(eventRef, {
      status: 'completed'
    }, { merge: true });
  } else {
    // Start next round
    await generateMatches(eventId, event.tableCount);
  }
};

// Waitlist
export const joinWaitlist = async (eventId: string, entry: Omit<WaitlistEntry, 'joinedAt'>) => {
  await setDoc(doc(db, 'events', eventId, 'waitlist', entry.uid), {
    ...entry,
    joinedAt: serverTimestamp(),
  });
};

export const leaveWaitlist = async (eventId: string, uid: string) => {
  await deleteDoc(doc(db, 'events', eventId, 'waitlist', uid));
};

export const listenToWaitlist = (eventId: string, callback: (entries: WaitlistEntry[]) => void) => {
  const q = query(collection(db, 'events', eventId, 'waitlist'), orderBy('joinedAt', 'asc'));
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({
      uid: d.data().uid as string,
      displayName: d.data().displayName as string,
      joinedAt: d.data().joinedAt?.toDate() || new Date(),
    })));
  });
};

// Announcements
export const sendAnnouncement = async (eventId: string, message: string) => {
  await addDoc(collection(db, 'events', eventId, 'announcements'), {
    message,
    createdAt: serverTimestamp(),
  });
};

export const listenToAnnouncements = (eventId: string, callback: (announcements: Announcement[]) => void) => {
  const q = query(collection(db, 'events', eventId, 'announcements'), orderBy('createdAt', 'desc'));
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({
      id: d.id,
      message: d.data().message as string,
      createdAt: d.data().createdAt?.toDate() || new Date(),
    })));
  });
};

// Match history — all completed matches for a specific participant in an event
export const getMyMatchHistory = async (eventId: string, uid: string): Promise<SpeedMatch[]> => {
  const snap = await getDocs(collection(db, 'events', eventId, 'matches'));
  return snap.docs
    .map(d => ({
      ...d.data(),
      matchId: d.id,
      sessionStartedAt: d.data().sessionStartedAt?.toDate() || null,
      sessionEndedAt: d.data().sessionEndedAt?.toDate() || null,
    } as SpeedMatch))
    .filter(m => m.status === 'completed' && (m.participant1Uid === uid || m.participant2Uid === uid))
    .sort((a, b) => a.round - b.round);
};

// Ratings
export const submitRating = async (
  eventId: string,
  rating: Omit<MatchRating, 'ratingId' | 'createdAt'>
) => {
  const ratingId = `${rating.fromUid}_${rating.matchId}`;
  await setDoc(doc(db, 'events', eventId, 'ratings', ratingId), {
    ...rating,
    ratingId,
    createdAt: serverTimestamp(),
  });
};

export const getMutualMatches = async (eventId: string, uid: string): Promise<string[]> => {
  const [myLikesSnap, theirLikesSnap] = await Promise.all([
    getDocs(query(collection(db, 'events', eventId, 'ratings'), where('fromUid', '==', uid), where('liked', '==', true))),
    getDocs(query(collection(db, 'events', eventId, 'ratings'), where('toUid', '==', uid), where('liked', '==', true))),
  ]);
  const likedUids = new Set(myLikesSnap.docs.map(d => d.data().toUid as string));
  const likedByUids = new Set(theirLikesSnap.docs.map(d => d.data().fromUid as string));
  return [...likedUids].filter(u => likedByUids.has(u));
};

export const pauseSession = async (eventId: string) => {
  await setDoc(doc(db, 'events', eventId), {
    paused: true,
    pausedAt: serverTimestamp(),
  }, { merge: true });
};

export const resumeSession = async (eventId: string, pausedAt: Date, accumulatedSeconds: number) => {
  const secondsPaused = (Date.now() - pausedAt.getTime()) / 1000;
  await setDoc(doc(db, 'events', eventId), {
    paused: false,
    pausedAt: null,
    pauseAccumulatedSeconds: accumulatedSeconds + secondsPaused,
  }, { merge: true });
};

export const cancelSession = async (eventId: string) => {
  const eventRef = doc(db, 'events', eventId);
  await setDoc(eventRef, {
    status: 'waiting',
    currentRound: 0,
    sessionStartedAt: null,
    sessionEndedAt: null
  }, { merge: true });
};