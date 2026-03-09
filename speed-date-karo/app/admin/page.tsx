'use client';

import { useAuth } from '../../components/AuthProvider';
import { useEffect, useState } from 'react';
import { getAllUsers, updateUserRole, getAllEvents } from '../../lib/firestore';
import { AppUser, Event } from '../../types';

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

  if (appUser?.role !== 'admin') return <div>Access denied</div>;

  return (
    <div className="p-4">
      <h1 className="text-2xl mb-4">Admin Panel</h1>
      <div className="flex mb-4">
        <button onClick={() => setTab('users')} className={tab === 'users' ? 'bg-blue-500 text-white p-2' : 'p-2'}>Users</button>
        <button onClick={() => setTab('events')} className={tab === 'events' ? 'bg-blue-500 text-white p-2' : 'p-2'}>Events</button>
      </div>
      {tab === 'users' && (
        <div>
          <h2>Users</h2>
          <ul>
            {users.map(user => (
              <li key={user.uid} className="flex justify-between p-2 border">
                <span>{user.displayName} ({user.email}) - {user.role}</span>
                <select value={user.role} onChange={(e) => updateUserRole(user.uid, e.target.value).then(() => {
                  setUsers(users.map(u => u.uid === user.uid ? { ...u, role: e.target.value as any } : u));
                })}>
                  <option value="participant">Participant</option>
                  <option value="moderator">Moderator</option>
                  <option value="admin">Admin</option>
                </select>
              </li>
            ))}
          </ul>
        </div>
      )}
      {tab === 'events' && (
        <div>
          <h2>Events</h2>
          <ul>
            {events.map(event => (
              <li key={event.eventId} className="p-2 border">
                {event.title} - {event.status} - {event.tableCount} tables
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}