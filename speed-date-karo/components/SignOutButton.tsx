'use client';

import { logout } from '../lib/auth';
import { useRouter } from 'next/navigation';

export default function SignOutButton() {
  const router = useRouter();

  const handleSignOut = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <button
      onClick={handleSignOut}
      className="px-3 py-1.5 text-sm font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
    >
      Çıkış
    </button>
  );
}
