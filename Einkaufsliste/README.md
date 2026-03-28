# Einkaufsliste – Gemeinsame Einkaufsliste für iPhone

Eine einfache iPhone-App zum gemeinsamen Verwalten von Einkaufslisten. Zwei Personen können die gleiche Liste gleichzeitig nutzen – alle Änderungen werden in Echtzeit synchronisiert.

## Features

- Artikel hinzufügen mit Kategorien (Obst & Gemüse, Milchprodukte, Fleisch & Fisch, etc.)
- Artikel abhaken und löschen
- Echtzeit-Synchronisierung zwischen zwei Geräten
- Offline-fähig (Änderungen werden synchronisiert, sobald wieder online)
- Geteilte Liste über eine einfache Listen-ID

## Voraussetzungen

- Mac mit Xcode 15 oder neuer
- iOS 17 oder neuer auf dem iPhone
- Ein Google/Firebase-Konto (kostenlos)

## Setup-Anleitung

### 1. Firebase-Projekt erstellen

1. Gehe zu [Firebase Console](https://console.firebase.google.com)
2. Klicke auf **Projekt hinzufügen**
3. Gib einen Namen ein (z.B. "Einkaufsliste") und folge dem Assistenten
4. Google Analytics kann deaktiviert werden (wird nicht benötigt)

### 2. iOS-App in Firebase registrieren

1. Im Firebase-Projekt, klicke auf **iOS+** um eine iOS-App hinzuzufügen
2. Bundle-ID eingeben: `com.deinname.Einkaufsliste` (muss mit der in Xcode übereinstimmen)
3. App-Name: "Einkaufsliste"
4. Klicke auf **App registrieren**
5. Lade die `GoogleService-Info.plist` herunter

### 3. Firebase-Dienste aktivieren

#### Authentication:
1. In der Firebase Console → **Authentication** → **Erste Schritte**
2. Unter **Anmeldemethode**: **Anonym** aktivieren

#### Realtime Database:
1. In der Firebase Console → **Realtime Database** → **Datenbank erstellen**
2. Standort wählen (z.B. `europe-west1`)
3. **Im Testmodus starten** wählen
4. Nach der Erstellung, unter **Regeln** folgende Regeln setzen:

```json
{
  "rules": {
    "lists": {
      "$listId": {
        ".read": true,
        ".write": true
      }
    }
  }
}
```

### 4. Xcode-Projekt einrichten

1. Öffne Xcode → **File** → **New** → **Project**
2. Wähle **App** (iOS)
3. Product Name: `Einkaufsliste`
4. Interface: **SwiftUI**
5. Language: **Swift**
6. Speichere das Projekt im `Einkaufsliste/`-Ordner

#### Quelldateien hinzufügen:
1. Lösche die automatisch erstellten `ContentView.swift` und `EinkaufslisteApp.swift`
2. Ziehe alle `.swift`-Dateien aus den Ordnern `Models/`, `Services/`, `ViewModels/`, `Views/` und `EinkaufslisteApp.swift` in den Xcode-Projektnavigator
3. Ziehe die heruntergeladene `GoogleService-Info.plist` in das Projekt

#### Firebase SDK hinzufügen:
1. In Xcode → **File** → **Add Package Dependencies...**
2. URL eingeben: `https://github.com/firebase/firebase-ios-sdk`
3. Version: **Up to Next Major Version**
4. Folgende Pakete auswählen:
   - `FirebaseAuth`
   - `FirebaseDatabase`
5. Klicke auf **Add Package**

### 5. App bauen und testen

1. Wähle dein iPhone als Zielgerät
2. Klicke auf **Run** (⌘R)
3. Die App startet und zeigt eine leere Einkaufsliste
4. Notiere die **Listen-ID** (in den Einstellungen sichtbar)

### 6. Zweites Gerät einrichten

1. Installiere die App auf dem zweiten iPhone
2. Öffne die **Einstellungen** (Zahnrad-Symbol)
3. Gib die Listen-ID des ersten Geräts unter **Einer Liste beitreten** ein
4. Tippe auf **Liste beitreten**

Jetzt sind beide Geräte synchronisiert! Jede Änderung erscheint sofort auf dem anderen Gerät.

## Benutzung

| Aktion | Geste |
|--------|-------|
| Artikel hinzufügen | **+** Taste oben rechts |
| Artikel abhaken | Auf den Artikel tippen |
| Artikel löschen | Nach links wischen |
| Erledigte entfernen | "Alle entfernen" im Erledigt-Bereich |
| Liste teilen | Einstellungen → Listen-ID kopieren/teilen |

## Projektstruktur

```
Einkaufsliste/
├── EinkaufslisteApp.swift          # App-Einstiegspunkt
├── Models/
│   ├── ShoppingItem.swift          # Artikel-Datenmodell
│   └── ShoppingCategory.swift      # Kategorien (Enum)
├── Services/
│   ├── FirebaseService.swift       # Firebase Realtime Database
│   └── AuthService.swift           # Anonyme Authentifizierung
├── ViewModels/
│   └── ShoppingListViewModel.swift # Geschäftslogik
└── Views/
    ├── ShoppingListView.swift      # Hauptbildschirm
    ├── AddItemView.swift           # Artikel hinzufügen
    ├── ItemRowView.swift           # Einzelne Zeile
    └── SettingsView.swift          # Einstellungen
```
