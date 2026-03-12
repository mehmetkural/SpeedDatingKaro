'use client';

import { useAuth } from '../../components/AuthProvider';
import { useEffect, useState } from 'react';
import { updateUserProfile } from '../../lib/firestore';
import SignOutButton from '../../components/SignOutButton';
import Link from 'next/link';

export default function ProfilePage() {
  const { appUser } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [interests, setInterests] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (appUser) {
      setDisplayName(appUser.displayName || '');
      setBio(appUser.bio || '');
      setInterests(appUser.interests || '');
    }
  }, [appUser]);

  if (!appUser) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    try {
      await updateUserProfile(appUser.uid, { displayName, bio, interests });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('Error saving profile:', err);
    } finally {
      setSaving(false);
    }
  };

  const backHref = appUser.role === 'moderator' ? '/moderator' : appUser.role === 'admin' ? '/admin' : '/participant';

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href={backHref} className="text-slate-400 hover:text-slate-700 transition text-sm font-medium">← Geri</Link>
            <h1 className="text-lg font-bold text-slate-900">Profilim</h1>
          </div>
          <SignOutButton />
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6">
        {/* Avatar placeholder */}
        <div className="flex items-center gap-4 mb-6 p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold shrink-0">
            {displayName.charAt(0).toUpperCase() || '?'}
          </div>
          <div>
            <p className="font-semibold text-slate-900">{displayName || 'İsim girilmedi'}</p>
            <p className="text-sm text-slate-500">{appUser.email}</p>
            <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-700">
              {appUser.role === 'admin' ? 'Admin' : appUser.role === 'moderator' ? 'Moderatör' : 'Katılımcı'}
            </span>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-slate-700">Adınız</label>
              <input
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-xl bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-slate-700">Email</label>
              <input
                type="text"
                value={appUser.email}
                disabled
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-400 cursor-not-allowed"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-slate-700">Hakkımda</label>
              <textarea
                value={bio}
                onChange={e => setBio(e.target.value)}
                placeholder="Kendinizden kısaca bahsedin..."
                rows={3}
                maxLength={200}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-xl bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition resize-none"
              />
              <p className="text-xs text-slate-400 text-right">{bio.length}/200</p>
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-slate-700">İlgi Alanları</label>
              <input
                type="text"
                value={interests}
                onChange={e => setInterests(e.target.value)}
                placeholder="örn: müzik, seyahat, yemek..."
                maxLength={100}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-xl bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm"
          >
            {saving ? 'Kaydediliyor...' : 'Kaydet'}
          </button>

          {saved && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm font-medium text-center">
              ✓ Profil güncellendi!
            </div>
          )}
        </form>
      </main>
    </div>
  );
}
