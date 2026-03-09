# SpeedDate Karo

Eine Echtzeit-Speed-Dating-Event-Verwaltungs-Web-App.

## Beschreibung

Diese App verwaltet Speed-Dating-Events in Cafés oder ähnlichen Umgebungen. Teilnehmer werden an Tischen platziert, haben begrenzte Zeit zum Gespräch und wechseln dann die Partner, bis alle sich kennengelernt haben.

## Tech Stack

- Next.js (App Router)
- TypeScript
- Firebase (Auth + Firestore)
- Tailwind CSS
- Echtzeit-Listener

## Rollen

- **Admin**: Alle Benutzer verwalten, Rollen ändern, alle Events anzeigen.
- **Moderator**: Events erstellen, eigene Events verwalten, Sessions starten.
- **Participant**: Offene Events beitreten, an Sessions teilnehmen.

## Setup

1. Firebase-Projekt erstellen:
   - Gehe zu [Firebase Console](https://console.firebase.google.com/).
   - Klicke "Projekt erstellen" (Create a project).
   - Gib einen Namen ein, z.B. "speed-date-karo".
   - Aktiviere Google Analytics (optional, aber empfohlen).
   - Wähle ein Google Analytics-Konto oder erstelle eines.
   - Klicke "Projekt erstellen" und warte, bis es fertig ist.
   
2. Authentifizierung aktivieren:
   - In der Firebase Console, gehe zu "Authentication" > "Sign-in method".
   - Aktiviere "Email/Password" als Anmeldemethode.
   
3. Firestore aktivieren:
   - Gehe zu "Firestore Database" > "Datenbank erstellen".
   - Wähle "Im Testmodus starten" (Start in test mode) für Entwicklung.
   - Oder setze die Security Rules wie im Abschnitt "Firebase Rules" beschrieben.
   
4. Web-App hinzufügen:
   - Gehe zu "Project settings" (Zahnrad-Icon).
   - Scrolle zu "Your apps" und klicke "Web-App hinzufügen" (Add app > Web </>).
   - Gib einen Nickname ein, z.B. "SpeedDate Web".
   - Aktiviere "Firebase Hosting" nicht (für jetzt).
   - Klicke "App registrieren" (Register app).
   - Kopiere die Firebase-Konfiguration (apiKey, authDomain, projectId, etc.).
   
5. Konfiguration in `lib/firebase.ts` eintragen:
   - Öffne `lib/firebase.ts`.
   - Ersetze die Platzhalter mit den kopierten Werten:
     ```typescript
     const firebaseConfig = {
       apiKey: "dein-api-key",
       authDomain: "dein-projekt.firebaseapp.com",
       projectId: "dein-projekt-id",
       storageBucket: "dein-projekt.appspot.com",
       messagingSenderId: "123456789",
       appId: "dein-app-id"
     };
     ```
   - Speichere die Datei.

6. Teste die App:
   - Stelle sicher, dass `npm install` und `npm run dev` ausgeführt wurden.
   - Öffne [http://localhost:3000](http://localhost:3000).
   - Registriere dich mit Email und Passwort (Rolle: participant).
   - Um Admin zu werden, melde dich als Admin an und ändere die Rolle in der Admin-Panel.

Hinweis: Neue Benutzer haben standardmäßig die Rolle "participant". Ändere Rollen über das Admin-Panel.
2. Firebase-Konfiguration in `lib/firebase.ts` eintragen (API-Key, etc.).
3. Firestore Security Rules setzen für Lese-/Schreibrechte (z.B. users collection für authenticated users).
4. Abhängigkeiten installieren: `npm install`
5. Entwicklungsserver starten: `npm run dev`
6. Öffne [http://localhost:3000](http://localhost:3000) und registriere dich als Admin/Moderator/Participant.

## Firebase Rules

Beispiel für Firestore Security Rules (in Firebase Console setzen):

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      allow read: if request.auth != null; // Für Admin
    }
    match /events/{eventId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && (resource.data.createdBy == request.auth.uid || request.auth.token.role == 'admin');
      match /participants/{participantId} {
        allow read, write: if request.auth != null;
      }
      match /matches/{matchId} {
        allow read, write: if request.auth != null;
      }
    }
  }
}
```

## Deployment

Verwende Vercel oder ähnliche Plattformen für das Deployment.
