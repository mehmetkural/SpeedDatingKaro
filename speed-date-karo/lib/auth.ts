import { auth, db } from './firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { AppUser } from '../types';

export const login = async (email: string, password: string) => {
  return signInWithEmailAndPassword(auth, email, password);
};

export const register = async (displayName: string, email: string, password: string) => {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;
  const appUser: AppUser = {
    uid: user.uid,
    displayName,
    email,
    role: 'participant', // default
    createdAt: new Date()
  };
  await setDoc(doc(db, 'users', user.uid), {
    ...appUser,
    createdAt: serverTimestamp()
  });
  return userCredential;
};

export const logout = () => signOut(auth);

export const getCurrentUserRole = async (uid: string): Promise<AppUser | null> => {
  const docSnap = await getDoc(doc(db, 'users', uid));
  if (docSnap.exists()) {
    const data = docSnap.data();
    return {
      ...data,
      createdAt: data.createdAt ? data.createdAt.toDate() : new Date()
    } as AppUser;
  }
  return null;
};

export const onAuthStateChange = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};