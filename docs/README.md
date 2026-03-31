# Einkaufsliste – Web-App

Eine gemeinsame Einkaufsliste als Web-App. Funktioniert auf jedem Handy im Browser – keine App-Installation nötig. Änderungen werden in Echtzeit zwischen beiden Geräten synchronisiert.

## Schnellstart (3 Schritte)

### 1. Firebase-Projekt erstellen (kostenlos)

1. Gehe zu [console.firebase.google.com](https://console.firebase.google.com)
2. **Projekt hinzufügen** → Name eingeben (z.B. "Einkaufsliste")
3. Google Analytics kann deaktiviert werden

#### Authentication aktivieren:
- **Authentication** → **Erste Schritte** → **Anonym** aktivieren

#### Realtime Database erstellen:
- **Realtime Database** → **Datenbank erstellen** → Standort `europe-west1` → **Im Testmodus starten**

#### Web-App registrieren:
- Auf der Projektübersicht: **</>** (Web) klicken
- App-Name eingeben → **App registrieren**
- Die angezeigte `firebaseConfig` kopieren

### 2. Konfiguration eintragen

Öffne `app.js` und ersetze den Block `firebaseConfig` (ca. Zeile 16) mit deinen Werten:

```javascript
const firebaseConfig = {
    apiKey: "AIzaSy...",
    authDomain: "dein-projekt.firebaseapp.com",
    databaseURL: "https://dein-projekt-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "dein-projekt",
    storageBucket: "dein-projekt.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abcdef"
};
```

### 3. Starten

**Option A – Lokal testen:**
```bash
cd Einkaufsliste-Web
python3 -m http.server 8080
```
Dann im Browser: `http://localhost:8080`

**Option B – Firebase Hosting (empfohlen für Handys):**
```bash
npm install -g firebase-tools
firebase login
firebase init hosting    # Public directory: . (Punkt)
firebase deploy
```
Du bekommst eine URL wie `https://dein-projekt.web.app` – diese auf beiden Handys öffnen.

**Option C – Beliebiger Webserver:**
Lade alle Dateien auf einen Webserver hoch (Netlify, Vercel, GitHub Pages, etc.)

## Benutzung

1. Öffne die URL auf deinem Handy
2. Füge die Seite zum **Homescreen** hinzu (Teilen → Zum Home-Bildschirm)
3. Notiere die **Listen-ID** in den Einstellungen (Zahnrad)
4. Auf dem zweiten Handy: gleiche URL öffnen → Einstellungen → Listen-ID eingeben → **Liste beitreten**
5. Beide sehen jetzt die gleiche Liste in Echtzeit!

## Features

- Artikel hinzufügen mit 7 Kategorien
- Abhaken durch Tippen
- Löschen durch Wischen (Touch) oder Löschen-Button
- Echtzeit-Sync zwischen beliebig vielen Geräten
- Installierbar als PWA auf dem Homescreen
- Funktioniert offline (Änderungen werden nachgeholt)
- Deutsche Benutzeroberfläche

## Dateien

| Datei | Beschreibung |
|-------|-------------|
| `index.html` | Hauptseite |
| `style.css` | iOS-ähnliches Design |
| `app.js` | Logik + Firebase-Anbindung |
| `manifest.json` | PWA-Konfiguration |
| `sw.js` | Service Worker für Offline-Support |
| `icon-*.png` | App-Icons |
