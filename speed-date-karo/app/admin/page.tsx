'use client';

import { useAuth } from '../../components/AuthProvider';
import { useEffect, useState } from 'react';
import { getAllUsers, updateUserRole, getAllEvents } from '../../lib/firestore';
import { AppUser, Event } from '../../types';
import SignOutButton from '../../components/SignOutButton';

export default function Admin() {
  const { appUser } = useAuth();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [tab, setTab] = useState<'users' | 'events'>('users');

  useEffect(() => {
    if (appUser?.role === 'admin') {
      getAllUsers().then(setUsers);
      getAllEvents().then(setEvents);
    }
  }, [appUser]);

  if (appUser?.role !== 'admin') return <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center text-white text-lg">Erişim Reddedildi</div>;

  const handleRoleChange = async (uid: string, newRole: string) => {
    await updateUserRole(uid, newRole);
    setUsers(users.map(u => u.uid === uid ? { ...u, role: newRole as AppUser['role'] } : u));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Admin Paneli</h1>
          <SignOutButton />
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
          </button>
        </div>

        {tab === 'users' && (
          <div>
            {users.length === 0 ? (
              <div className="text-center py-12 bg-gray-800 rounded border border-gray-700">
                <p className="text-gray-400">Henüz kullanıcı yok</p>
              </div>
            ) : (
              <div className="space-y-2">
                {users.map(user => (
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
            {events.length === 0 ? (
              <div className="text-center py-12 bg-gray-800 rounded border border-gray-700">
                <p className="text-gray-400">Henüz etkinlik yok</p>
              </div>
            ) : (
              <div className="space-y-2">
                {events.map(event => (
                  <div key={event.eventId} className="p-4 border border-gray-700 rounded bg-gray-800 hover:bg-gray-700 transition">
                    <div className="flex justify-between items-center">
                      <div className="flex-1">
                        <p className="font-bold text-lg text-white">{event.title}</p>
                        <p className="text-sm text-gray-400">Oluşturan: {event.createdBy}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-white">Masalar: {event.tableCount}</p>
                        <span className={`px-3 py-1 rounded text-white text-sm font-medium inline-block ${
                          event.status === 'waiting' ? 'bg-yellow-600' :
                          event.status === 'active' ? 'bg-green-600' :
                          'bg-gray-600'
                        }`}>
                          {event.status === 'waiting' ? 'Bekleniyor' : event.status === 'active' ? 'Aktif' : 'Tamamlandı'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}