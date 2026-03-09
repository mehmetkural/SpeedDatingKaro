'use client';

import { useAuth } from '../../components/AuthProvider';
import { useEffect, useState } from 'react';
import { getMyEvents, deleteEvent } from '../../lib/firestore';
import { Event } from '../../types';
import Link from 'next/link';

export default function Moderator() {
  const { appUser } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);

  useEffect(() => {
    if (appUser?.role === 'moderator') {
      getMyEvents(appUser.uid).then(setEvents);
    }
  }, [appUser]);

  if (appUser?.role !== 'moderator') return <div>Access denied</div>;

  const handleDelete = async (eventId: string) => {
    if (confirm('Are you sure?')) {
      await deleteEvent(eventId);
      setEvents(events.filter(e => e.eventId !== eventId));
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl mb-4">My Events</h1>
      <Link href="/moderator/create" className="bg-green-500 text-white p-2 mb-4 inline-block">Create Event</Link>
      <ul>
        {events.map(event => (
          <li key={event.eventId} className="flex justify-between p-2 border mb-2">
            <span>{event.title} - {event.status} - {event.tableCount} tables</span>
            <div>
              <Link href={`/moderator/${event.eventId}`} className="bg-blue-500 text-white p-1 mr-2">View</Link>
              <button onClick={() => handleDelete(event.eventId)} className="bg-red-500 text-white p-1">Delete</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}