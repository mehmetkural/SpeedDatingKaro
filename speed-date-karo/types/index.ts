export interface AppUser {
  uid: string;
  displayName: string;
  email: string;
  role: "admin" | "moderator" | "participant";
  createdAt: Date;
}

export interface Event {
  eventId: string;
  title: string;
  createdBy: string;
  tableCount: number;
  sessionDurationSeconds: number;
  status: "waiting" | "active" | "completed";
  createdAt: Date;
  currentRound: number;
  sessionStartedAt?: Date | null;
  sessionEndedAt?: Date | null;
}

export interface Participant {
  uid: string;
  displayName: string;
  joinedAt: Date;
  isReady: boolean;
}

export interface SpeedMatch {
  matchId: string;
  round: number;
  tableNumber: number;
  participant1Uid: string;
  participant2Uid: string;
  participant1Ready: boolean;
  participant2Ready: boolean;
  sessionStartedAt: Date | null;
  sessionEndedAt: Date | null;
  status: "pending" | "in_progress" | "completed";
}