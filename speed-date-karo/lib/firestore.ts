import { db } from './firebase';
import { collection, doc, getDocs, getDoc, addDoc, updateDoc, deleteDoc, setDoc, onSnapshot, query, where, orderBy, writeBatch, serverTimestamp } from 'firebase/firestore';
import { Event, Participant, SpeedMatch, AppUser } from '../types';
import { v4 as uuidv4 } from 'uuid';

// Matching Algorithm
export const generateMatches = async (eventId: string, tableCount: number): Promise<{ allPaired: boolean }> => {
  const event = await getEvent(eventId);
  if (!event) throw new Error('Event not found');

  const participants = await getEventParticipants(eventId);
  if (participants.length < 2) throw new Error('At least 2 participants required');

  const pastMatches = await getPastMatches(eventId);
  const pastPairSet = new Set(pastMatches.map(m => {
    const [uid1, uid2] = [m.participant1Uid, m.participant2Uid].sort();
    return `${uid1}_${uid2}`;
  }));

  const shuffled = [...participants].sort(() => Math.random() - 0.5);
  const matches: SpeedMatch[] = [];
  const matched = new Set<string>();
  let tableNumber = 1;

  for (let i = 0; i < shuffled.length; i++) {
    if (matched.has(shuffled[i].uid)) continue;

    let partner: Participant | null = null;
    for (let j = i + 1; j < shuffled.length; j++) {
      if (matched.has(shuffled[j].uid)) continue;

      const [uid1, uid2] = [shuffled[i].uid, shuffled[j].uid].sort();
      const pairKey = `${uid1}_${uid2}`;

      if (!pastPairSet.has(pairKey)) {
        partner = shuffled[j];
        break;
      }
    }

    if (partner) {
      matched.add(shuffled[i].uid);
      matched.add(partner.uid);

      matches.push({
        matchId: uuidv4(),
        round: event.currentRound + 1,
        tableNumber: tableNumber % tableCount + 1,
        participant1Uid: shuffled[i].uid,
        participant2Uid: partner.uid,
        participant1Ready: false,
        participant2Ready: false,
        sessionStartedAt: null,
        sessionEndedAt: null,
        status: 'in_progress'
      });

      tableNumber++;
    }
  }

  const batch = writeBatch(db);
  
  // Write all matches
  matches.forEach(match => {
    const docRef = doc(db, 'events', eventId, 'matches', match.matchId);
    const { sessionStartedAt, ...matchWithoutTimestamp } = match;
    const matchData = {
      ...matchWithoutTimestamp,
      sessionStartedAt: null  // Timer starts when BOTH participants are ready
    };
    batch.set(docRef, matchData as any);
  });

  // Update event status and round with sessionStartedAt
  const eventRef = doc(db, 'events', eventId);
  
  // Calculate total rounds if not set (n participants = max n-1 rounds)
  const totalRounds = event.totalRounds || Math.max(participants.length - 1, 1);
  
  batch.update(eventRef, {
    status: 'active',
    currentRound: event.currentRound + 1,
    totalRounds: totalRounds,
    sessionStartedAt: serverTimestamp()
  });

  await batch.commit();
  
  console.log('✓ Batch committed successfully');
  console.log('Total matches written:', matches.length);
  
  // Verify by reading back one match
  const firstMatchRef = doc(db, 'events', eventId, 'matches', matches[0].matchId);
  const firstMatchSnap = await getDoc(firstMatchRef);
  console.log('Verification - First match sessionStartedAt:', firstMatchSnap.data()?.sessionStartedAt);

  const totalPossiblePairs = participants.length * (participants.length - 1) / 2;
  const allPaired = pastPairSet.size + matches.filter(m => m.participant2Uid).length >= totalPossiblePairs;

  return { allPaired };
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