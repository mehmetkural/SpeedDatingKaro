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

**Matching algorithm** (in `lib/firestore.ts`): uses the **round-robin circle method** — fixes one participant, rotates the rest each round. Even n → n-1 rounds; odd n → n rounds with one bye per round. Uses Firestore batch writes. `generateMatches` is called once per round (both for round 1 via moderator UI and subsequent rounds via `checkAndAdvanceRound`).

**Auth state** is managed by `components/AuthProvider.tsx` which wraps the root layout and provides `useAuth()` context throughout the app.

**Firebase initialization** is guarded client-side only (`typeof window !== 'undefined'`) in `lib/firebase.ts` to prevent SSR errors during Vercel build.

**CountdownTimer** (`components/CountdownTimer.tsx`): uses `sessionStartedAt.getTime()` (numeric timestamp) as the effect dependency — not the Date object itself — to avoid re-triggering on Firestore listener re-renders that create new Date instances with the same value. Uses a `firedRef` to fire `onTimeUp` exactly once, and an `onTimeUpRef` to avoid stale closures.

## Vercel Deployment

- **Root Directory** must be set to `speed-date-karo` in Vercel project settings
- All `NEXT_PUBLIC_FIREBASE_*` env vars must be added in Vercel → Settings → Environment Variables (Production + Preview + Development)
- Firebase is on **Blaze plan** (pay-as-you-go) to avoid daily quota limits

## Firebase Security Rules

Firestore rules allow:
- Any authenticated user to read users/events/participants/matches
- Participants to update their own ready flags on match documents (`participant1Ready` / `participant2Ready`)
- Moderators/admins to create events and write matches
- Admins to update any user's role

## Admin Account Setup

There is no admin registration flow. To make a user admin: register normally on the site, then set `role: "admin"` on their `/users/{uid}` document directly in Firebase Console → Firestore.
