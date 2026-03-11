import { db } from './firebase';
import { collection, doc, getDocs, getDoc, addDoc, updateDoc, deleteDoc, setDoc, onSnapshot, query, where, orderBy, writeBatch, serverTimestamp } from 'firebase/firestore';
import { Event, Participant, SpeedMatch, AppUser } from '../types';
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
    const { sessionStartedAt, sessionEndedAt, ...rest } = match;
    batch.set(docRef, { ...rest, sessionStartedAt: null, sessionEndedAt: null } as any);
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
export const getEvent = async (eventId: string): Promise<Event | null> => {
  const docSnap = await getDoc(doc(db, 'events', eventId));
  if (docSnap.exists()) {
    const data = docSnap.data();
    return {
      ...data,
      eventId: docSnap.id,
      createdAt: data.createdAt?.toDate() || new Date()
    } as Event;
  }
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

export const listenToEvent = (eventId: string, callback: (event: Event) => void) => {
  return onSnapshot(doc(db, 'events', eventId), (doc) => {
    if (doc.exists()) {
      const data = doc.data();
      callback({
        ...data,
        eventId: doc.id,
        createdAt: data.createdAt?.toDate() || new Date()
      } as Event);
    }
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

export const getAllEvents = async (): Promise<Event[]> => {
  const querySnapshot = await getDocs(collection(db, 'events'));
  return querySnapshot.docs.map(doc => ({
    ...doc.data(),
    eventId: doc.id,
    createdAt: doc.data().createdAt?.toDate() || new Date()
  } as Event));
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
  return querySnapshot.docs.map(doc => ({
    ...doc.data(),
    eventId: doc.id,
    createdAt: doc.data().createdAt?.toDate() || new Date()
  } as Event));
};

export const deleteEvent = async (eventId: string) => {
  await deleteDoc(doc(db, 'events', eventId));
};

// Participant
export const getOpenEvents = async (): Promise<Event[]> => {
  const q = query(collection(db, 'events'), where('status', 'in', ['waiting', 'active']), orderBy('createdAt', 'desc'));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    ...doc.data(),
    eventId: doc.id,
    createdAt: doc.data().createdAt?.toDate() || new Date()
  } as Event));
};

export const joinEvent = async (eventId: string, participant: Omit<Participant, 'joinedAt'>) => {
  await setDoc(doc(db, 'events', eventId, 'participants', participant.uid), {
    ...participant,
    joinedAt: serverTimestamp()
  });
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
  
  const updateData: any = {
    [isParticipant1 ? 'participant1Ready' : 'participant2Ready']: true
  };
  
  // Check if both participants are ready
  const bothReady = isParticipant1 ? match.participant2Ready : match.participant1Ready;
  if (bothReady) {
    // Both ready - start the timer
    updateData.sessionStartedAt = serverTimestamp();
    console.log('✓ Both participants ready - Timer started!');
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
  const roundMatches = querySnapshot.docs.map(doc => ({
    ...doc.data(),
    matchId: doc.id
  } as any));

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

export const cancelSession = async (eventId: string) => {
  const eventRef = doc(db, 'events', eventId);
  await setDoc(eventRef, {
    status: 'waiting',
    currentRound: 0,
    sessionStartedAt: null,
    sessionEndedAt: null
  }, { merge: true });
};