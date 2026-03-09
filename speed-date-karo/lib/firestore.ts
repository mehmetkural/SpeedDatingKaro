import { db } from './firebase';
import { collection, doc, getDocs, getDoc, addDoc, updateDoc, deleteDoc, setDoc, onSnapshot, query, where, orderBy, writeBatch, serverTimestamp } from 'firebase/firestore';
import { Event, Participant, SpeedMatch, AppUser } from '../types';

// Admin

export const getAllUsers = async (): Promise<AppUser[]> => {
  const querySnapshot = await getDocs(collection(db, 'users'));
  return querySnapshot.docs.map(doc => ({
    ...doc.data(),
    createdAt: doc.data().createdAt.toDate()
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
    createdAt: doc.data().createdAt.toDate()
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
    createdAt: doc.data().createdAt.toDate()
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
    createdAt: doc.data().createdAt.toDate()
  } as Event));
};

export const joinEvent = async (eventId: string, participant: Omit<Participant, 'joinedAt'>) => {
  await setDoc(doc(db, 'events', eventId, 'participants', participant.uid), {
    ...participant,
    joinedAt: serverTimestamp()
  });
};

// Common

export const getEvent = async (eventId: string): Promise<Event | null> => {
  const docSnap = await getDoc(doc(db, 'events', eventId));
  if (docSnap.exists()) {
    const data = docSnap.data();
    return {
      ...data,
      eventId: docSnap.id,
      createdAt: data.createdAt.toDate()
    } as Event;
  }
  return null;
};

export const listenToEvent = (eventId: string, callback: (event: Event) => void) => {
  return onSnapshot(doc(db, 'events', eventId), (doc) => {
    if (doc.exists()) {
      const data = doc.data();
      callback({
        ...data,
        eventId: doc.id,
        createdAt: data.createdAt.toDate()
      } as Event);
    }
  });
};

export const listenToParticipants = (eventId: string, callback: (participants: Participant[]) => void) => {
  return onSnapshot(collection(db, 'events', eventId, 'participants'), (querySnapshot) => {
    const participants = querySnapshot.docs.map(doc => ({
      ...doc.data(),
      joinedAt: doc.data().joinedAt.toDate()
    } as Participant));
    callback(participants);
  });
};