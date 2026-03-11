# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Layout

The Next.js application lives in `speed-date-karo/`. All development work happens there.

```
SpeedDatingKaro/
└── speed-date-karo/      # Main application (Next.js App Router)
    ├── app/              # Pages and routes
    ├── components/       # Shared React components
    ├── lib/              # Firebase init, auth, and Firestore logic
    └── types/index.ts    # All shared TypeScript interfaces
```

## Commands

All commands run from `speed-date-karo/`:

```bash
npm run dev     # Start dev server at http://localhost:3000
npm run build   # Production build
npm run lint    # ESLint check
```

There are no automated tests in this project.

## Architecture

**Tech stack:** Next.js 16 (App Router), TypeScript, Tailwind CSS 4, Firebase (Auth + Firestore)

**Role-based routing** — The root `app/page.tsx` redirects users based on their role stored in Firestore:
- `admin` → `/admin`
- `moderator` → `/moderator`
- `participant` → `/participant`

Roles are set in Firestore at `/users/{uid}.role` on registration.

**Firebase layer** (`lib/`):
- `firebase.ts` — initializes `auth` and `db` (Firestore) instances
- `auth.ts` — login, register, logout wrappers
- `firestore.ts` — all database operations (20+ exported functions); contains the matching algorithm

**Firestore data model:**
```
/users/{uid}                       # AppUser: uid, displayName, email, role, createdAt
/events/{eventId}                  # Event: title, status, tableCount, currentRound, totalRounds, sessionDurationSeconds
/events/{eventId}/participants/{uid}   # Participant: uid, displayName, joinedAt, isReady
/events/{eventId}/matches/{matchId}    # SpeedMatch: round, tableNumber, participant1Uid, participant2Uid, status, readiness flags
```

**Event lifecycle:** `waiting` → `active` → `completed`

**Matching algorithm** (in `lib/firestore.ts`): prevents repeat pairings across rounds, shuffles randomly, assigns table numbers, calculates `totalRounds = max(participantCount - 1, 1)`, uses Firestore batch writes.

**Auth state** is managed by `components/AuthProvider.tsx` which wraps the root layout and provides `useAuth()` context throughout the app.

## Environment

Firebase credentials are in `speed-date-karo/.env.local`. Firebase Security Rules must be deployed manually via the Firebase Console — see `FIREBASE_SETUP.md` for the required rules.
