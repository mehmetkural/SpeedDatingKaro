'use client';

import { useState } from 'react';
import { register } from '../../lib/auth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Register() {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      setError('Şifreler uyuşmuyor');
      return;
    }
    setLoading(true);
    try {
      await register(displayName, email, password);
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kayıt başarısız');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-2">SpeedDate Karo</h1>
          <p className="text-gray-400">Yeni hesap oluşturun</p>
        </div>
        
        <form onSubmit={handleSubmit} className="bg-gray-800 p-6 rounded border border-gray-700 space-y-4">
          <h2 className="text-2xl font-bold text-white mb-4">Kaydol</h2>
          
          {error && (
            <div className="p-3 bg-red-900 border border-red-700 rounded text-red-200 text-sm">
              {error}
            </div>
          )}
          
          <div>
            <label className="block text-sm font-bold text-gray-300 mb-2">Adınız</label>
            <input
              type="text"
              placeholder="Adınızı girin"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full p-3 border border-gray-600 rounded bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              required
              disabled={loading}
            />
          </div>
          
          <div>
            <label className="block text-sm font-bold text-gray-300 mb-2">Email Adresi</label>
            <input
              type="email"
              placeholder="example@mail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 border border-gray-600 rounded bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              required
              disabled={loading}
            />
          </div>
          
          <div>
            <label className="block text-sm font-bold text-gray-300 mb-2">Şifre</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 border border-gray-600 rounded bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              required
              disabled={loading}
            />
          </div>
          
          <div>
            <label className="block text-sm font-bold text-gray-300 mb-2">Şifre Tekrar</label>
            <input
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full p-3 border border-gray-600 rounded bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              required
              disabled={loading}
            />
          </div>
          
          <button 
            type="submit" 
            disabled={loading || !displayName || !email || !password || !confirmPassword}
            className="w-full p-3 bg-gradient-to-r from-green-500 to-green-600 text-white font-bold rounded hover:from-green-600 hover:to-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-lg"
          >
            {loading ? 'Kaydediliyor...' : 'Kaydol'}
          </button>
          
          <div className="text-center pt-4 border-t border-gray-700">
            <p className="text-gray-400">Zaten hesabınız var mı? <Link href="/login" className="text-blue-400 hover:text-blue-300 font-semibold">Giriş Yap</Link></p>
          </div>
        </form>
      </div>
    </div>
  );
}