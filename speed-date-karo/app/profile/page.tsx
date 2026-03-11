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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center text-white">
      Yükleniyor...
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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white p-4">
      <div className="max-w-lg mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Profilim</h1>
          <div className="flex items-center gap-3">
            <Link href={backHref} className="text-gray-400 hover:text-white text-sm transition">← Geri</Link>
            <SignOutButton />
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-5">
          <div className="p-6 bg-gray-800 rounded-xl border border-gray-700 space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-300 mb-2">Adınız</label>
              <input
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                className="w-full p-3 border border-gray-600 rounded bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-300 mb-2">Email</label>
              <input
                type="text"
                value={appUser.email}
                disabled
                className="w-full p-3 border border-gray-600 rounded bg-gray-900 text-gray-500 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-300 mb-2">Hakkımda</label>
              <textarea
                value={bio}
                onChange={e => setBio(e.target.value)}
                placeholder="Kendinizden kısaca bahsedin..."
                rows={3}
                maxLength={200}
                className="w-full p-3 border border-gray-600 rounded bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none"
              />
              <p className="text-xs text-gray-500 mt-1">{bio.length}/200</p>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-300 mb-2">İlgi Alanları</label>
              <input
                type="text"
                value={interests}
                onChange={e => setInterests(e.target.value)}
                placeholder="örn: müzik, seyahat, yemek..."
                maxLength={100}
                className="w-full p-3 border border-gray-600 rounded bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold rounded-xl hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-lg"
          >
            {saving ? 'Kaydediliyor...' : 'Kaydet'}
          </button>

          {saved && (
            <div className="text-center p-3 bg-green-800 border border-green-600 rounded text-green-200 font-semibold">
              ✓ Profil güncellendi!
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
