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
    <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500">
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
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-10 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <h1 className="text-lg font-bold text-slate-900">Admin Paneli</h1>
          <SignOutButton />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-4">

        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 text-center">
            <p className="text-2xl font-bold text-slate-900">{users.length}</p>
            <p className="text-xs text-slate-500 mt-0.5">Kullanıcı</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 text-center">
            <p className="text-2xl font-bold text-slate-900">{totalEvents}</p>
            <p className="text-xs text-slate-500 mt-0.5">Etkinlik</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 text-center">
            <p className="text-2xl font-bold text-slate-900">{completedEvents}</p>
            <p className="text-xs text-slate-500 mt-0.5">Tamamlanan</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => setTab('users')}
            className={`px-4 py-2.5 text-sm font-semibold transition border-b-2 -mb-px ${
              tab === 'users'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Kullanıcılar ({users.length})
          </button>
          <button
            onClick={() => setTab('events')}
            className={`px-4 py-2.5 text-sm font-semibold transition border-b-2 -mb-px flex items-center gap-2 ${
              tab === 'events'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Etkinlikler ({events.length})
            {activeEvents > 0 && (
              <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                {activeEvents} aktif
              </span>
            )}
          </button>
        </div>

        {tab === 'users' && (
          <div className="space-y-3">
            <input
              type="text"
              placeholder="İsim veya email ile ara..."
              value={userSearch}
              onChange={e => setUserSearch(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-300 rounded-xl bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition text-sm"
            />
            {filteredUsers.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 shadow-sm">
                <p className="text-slate-400 text-sm">{userSearch ? 'Kullanıcı bulunamadı' : 'Henüz kullanıcı yok'}</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <ul className="divide-y divide-slate-100">
                  {filteredUsers.map(user => (
                    <li key={user.uid} className="flex items-center px-4 py-3 gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-sm font-bold shrink-0">
                        {user.displayName.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-900 text-sm truncate">{user.displayName}</p>
                        <p className="text-xs text-slate-400 truncate">{user.email}</p>
                      </div>
                      <select
                        value={user.role}
                        onChange={(e) => handleRoleChange(user.uid, e.target.value)}
                        className="px-2 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-700 text-xs font-medium focus:outline-none focus:border-blue-500 transition shrink-0"
                      >
                        <option value="participant">Katılımcı</option>
                        <option value="moderator">Moderatör</option>
                        <option value="admin">Admin</option>
                      </select>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {tab === 'events' && (
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Etkinlik adı ile ara..."
              value={eventSearch}
              onChange={e => setEventSearch(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-300 rounded-xl bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition text-sm"
            />
            {filteredEvents.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 shadow-sm">
                <p className="text-slate-400 text-sm">{eventSearch ? 'Etkinlik bulunamadı' : 'Henüz etkinlik yok'}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredEvents.map(event => {
                  const stats = eventStats[event.eventId];
                  return (
                    <div key={event.eventId} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-slate-900 truncate">{event.title}</p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {event.location && <span>📍 {event.location} · </span>}
                            {event.tableCount} masa · {event.sessionDurationSeconds / 60}dk/tur
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                            event.status === 'waiting' ? 'bg-amber-100 text-amber-700' :
                            event.status === 'active' ? 'bg-green-100 text-green-700' :
                            'bg-slate-100 text-slate-600'
                          }`}>
                            {event.status === 'waiting' ? 'Bekleniyor' : event.status === 'active' ? 'Aktif' : 'Tamamlandı'}
                          </span>
                          <button
                            onClick={() => handleLoadStats(event.eventId)}
                            disabled={loadingStats === event.eventId}
                            className="px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-semibold rounded-lg transition disabled:opacity-50 border border-blue-100"
                          >
                            {loadingStats === event.eventId ? '...' : stats ? '📊' : 'İstatistik'}
                          </button>
                        </div>
                      </div>

                      {stats && (
                        <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {[
                            { label: 'Katılımcı', value: stats.totalParticipants },
                            { label: 'Maç', value: `${stats.completedMatches}/${stats.totalMatches}` },
                            { label: 'Tamamlanma', value: `${stats.completionRate}%` },
                            { label: 'Ort. Süre', value: stats.avgMatchDurationSeconds != null ? `${Math.round(stats.avgMatchDurationSeconds)}s` : '—' },
                          ].map(({ label, value }) => (
                            <div key={label} className="bg-slate-50 rounded-xl p-2 text-center border border-slate-100">
                              <p className="text-base font-bold text-slate-900">{value}</p>
                              <p className="text-xs text-slate-400">{label}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
