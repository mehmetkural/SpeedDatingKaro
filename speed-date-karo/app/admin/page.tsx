'use client';

import { useAuth } from '../../components/AuthProvider';
import { useEffect, useState } from 'react';
import { getAllUsers, updateUserRole, getAllEvents, getEventStats, EventStats } from '../../lib/firestore';
import { AppUser, Event } from '../../types';
import SignOutButton from '../../components/SignOutButton';

export default function Admin() {
  const { appUser } = useAuth();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [tab, setTab] = useState<'users' | 'events'>('users');
  const [userSearch, setUserSearch] = useState('');
  const [eventSearch, setEventSearch] = useState('');
  const [eventStats, setEventStats] = useState<Record<string, EventStats>>({});
  const [loadingStats, setLoadingStats] = useState<string | null>(null);

  useEffect(() => {
    if (appUser?.role === 'admin') {
      getAllUsers().then(setUsers);
      getAllEvents().then(setEvents);
    }
  }, [appUser]);

  if (appUser?.role !== 'admin') return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center text-white text-lg">
      Erişim Reddedildi
    </div>
  );

  const handleRoleChange = async (uid: string, newRole: string) => {
    await updateUserRole(uid, newRole);
    setUsers(users.map(u => u.uid === uid ? { ...u, role: newRole as AppUser['role'] } : u));
  };

  const handleLoadStats = async (eventId: string) => {
    if (eventStats[eventId]) return;
    setLoadingStats(eventId);
    try {
      const stats = await getEventStats(eventId);
      setEventStats(prev => ({ ...prev, [eventId]: stats }));
    } finally {
      setLoadingStats(null);
    }
  };

  const filteredUsers = users.filter(u =>
    u.displayName.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email.toLowerCase().includes(userSearch.toLowerCase())
  );

  const filteredEvents = events.filter(e =>
    e.title.toLowerCase().includes(eventSearch.toLowerCase())
  );

  const totalEvents = events.length;
  const completedEvents = events.filter(e => e.status === 'completed').length;
  const activeEvents = events.filter(e => e.status === 'active').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Admin Paneli</h1>
          <SignOutButton />
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="p-4 bg-gradient-to-br from-blue-900 to-blue-800 rounded border border-blue-700 text-center">
            <p className="text-2xl font-bold text-white">{users.length}</p>
            <p className="text-xs text-blue-300">Toplam Kullanıcı</p>
          </div>
          <div className="p-4 bg-gradient-to-br from-purple-900 to-purple-800 rounded border border-purple-700 text-center">
            <p className="text-2xl font-bold text-white">{totalEvents}</p>
            <p className="text-xs text-purple-300">Toplam Etkinlik</p>
          </div>
          <div className="p-4 bg-gradient-to-br from-green-900 to-green-800 rounded border border-green-700 text-center">
            <p className="text-2xl font-bold text-white">{completedEvents}</p>
            <p className="text-xs text-green-300">Tamamlanan</p>
          </div>
        </div>

        <div className="flex gap-4 mb-6 border-b border-gray-700">
          <button
            onClick={() => setTab('users')}
            className={`px-4 py-2 font-bold rounded-t transition ${tab === 'users' ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white border-b-2 border-blue-400' : 'text-gray-400 hover:text-white'}`}
          >
            Kullanıcılar ({users.length})
          </button>
          <button
            onClick={() => setTab('events')}
            className={`px-4 py-2 font-bold rounded-t transition ${tab === 'events' ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white border-b-2 border-blue-400' : 'text-gray-400 hover:text-white'}`}
          >
            Etkinlikler ({events.length})
            {activeEvents > 0 && <span className="ml-2 px-1.5 py-0.5 bg-green-500 text-white text-xs rounded-full">{activeEvents} aktif</span>}
          </button>
        </div>

        {tab === 'users' && (
          <div>
            <input
              type="text"
              placeholder="İsim veya email ile ara..."
              value={userSearch}
              onChange={e => setUserSearch(e.target.value)}
              className="w-full mb-4 p-3 border border-gray-600 rounded bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
            />
            {filteredUsers.length === 0 ? (
              <div className="text-center py-12 bg-gray-800 rounded border border-gray-700">
                <p className="text-gray-400">{userSearch ? 'Kullanıcı bulunamadı' : 'Henüz kullanıcı yok'}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredUsers.map(user => (
                  <div key={user.uid} className="flex justify-between items-center p-4 border border-gray-700 rounded bg-gray-800 hover:bg-gray-700 transition">
                    <div className="flex-1">
                      <p className="font-bold text-white">{user.displayName}</p>
                      <p className="text-sm text-gray-400">{user.email}</p>
                    </div>
                    <select
                      value={user.role}
                      onChange={(e) => handleRoleChange(user.uid, e.target.value)}
                      className="p-2 border border-gray-600 rounded bg-gray-700 text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="participant">Katılımcı</option>
                      <option value="moderator">Moderatör</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'events' && (
          <div>
            <input
              type="text"
              placeholder="Etkinlik adı ile ara..."
              value={eventSearch}
              onChange={e => setEventSearch(e.target.value)}
              className="w-full mb-4 p-3 border border-gray-600 rounded bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
            />
            {filteredEvents.length === 0 ? (
              <div className="text-center py-12 bg-gray-800 rounded border border-gray-700">
                <p className="text-gray-400">{eventSearch ? 'Etkinlik bulunamadı' : 'Henüz etkinlik yok'}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredEvents.map(event => {
                  const stats = eventStats[event.eventId];
                  return (
                    <div key={event.eventId} className="p-4 border border-gray-700 rounded bg-gray-800">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="font-bold text-lg text-white">{event.title}</p>
                          <p className="text-sm text-gray-400">
                            Oluşturan: {event.createdBy.slice(0, 8)}...
                            {event.location && <span> · 📍 {event.location}</span>}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 ml-3">
                          <span className={`px-3 py-1 rounded text-white text-sm font-medium ${
                            event.status === 'waiting' ? 'bg-yellow-600' :
                            event.status === 'active' ? 'bg-green-600' : 'bg-gray-600'
                          }`}>
                            {event.status === 'waiting' ? 'Bekleniyor' : event.status === 'active' ? 'Aktif' : 'Tamamlandı'}
                          </span>
                          <button
                            onClick={() => handleLoadStats(event.eventId)}
                            disabled={loadingStats === event.eventId}
                            className="px-3 py-1 bg-blue-700 hover:bg-blue-600 text-white text-sm rounded transition disabled:opacity-50"
                          >
                            {loadingStats === event.eventId ? '...' : stats ? '📊' : 'İstatistik'}
                          </button>
                        </div>
                      </div>

                      {stats && (
                        <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
                          <div className="p-2 bg-gray-700 rounded text-center">
                            <p className="text-lg font-bold text-white">{stats.totalParticipants}</p>
                            <p className="text-xs text-gray-400">Katılımcı</p>
                          </div>
                          <div className="p-2 bg-gray-700 rounded text-center">
                            <p className="text-lg font-bold text-white">{stats.completedMatches}/{stats.totalMatches}</p>
                            <p className="text-xs text-gray-400">Maç</p>
                          </div>
                          <div className="p-2 bg-gray-700 rounded text-center">
                            <p className="text-lg font-bold text-white">{stats.completionRate}%</p>
                            <p className="text-xs text-gray-400">Tamamlanma</p>
                          </div>
                          <div className="p-2 bg-gray-700 rounded text-center">
                            <p className="text-lg font-bold text-white">
                              {stats.avgMatchDurationSeconds != null ? `${Math.round(stats.avgMatchDurationSeconds)}s` : '—'}
                            </p>
                            <p className="text-xs text-gray-400">Ort. Süre</p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
