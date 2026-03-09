'use client';

import { useAuth } from '../components/AuthProvider';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function Home() {
  const { user, appUser, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
      } else if (appUser?.role === 'admin') {
        router.push('/admin');
      } else if (appUser?.role === 'moderator') {
        router.push('/moderator');
      } else if (appUser?.role === 'participant') {
        router.push('/participant');
      }
    }
  }, [user, appUser, loading, router]);

  if (loading) return <div className="flex min-h-screen items-center justify-center">Loading...</div>;

  return <div className="flex min-h-screen items-center justify-center">Redirecting...</div>;
}
