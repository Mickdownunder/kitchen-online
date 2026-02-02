# Baleah DB-Migration – Schritt für Schritt

## Voraussetzung
- Neuer Baleah-User muss **vorher** in Supabase angelegt sein

---

## Schritt 1: User in Baleah anlegen

1. **Supabase Dashboard** öffnen → Projekt **hysuwlvxpuchmgotvhpx** (Baleah)
2. **Authentication** → **Users** → **Add user** → **Create new user**
3. E-Mail und Passwort für Baleah eintragen
4. **User-ID kopieren** (z.B. `a1b2c3d4-e5f6-7890-abcd-ef1234567890`)

---

## Schritt 2: Backup mit neuer User-ID erzeugen

Im Terminal (im Projektordner):

```bash
python3 scripts/replace-user-id.py <DEINE_BALEAH_USER_ID>
```

Beispiel:
```bash
python3 scripts/replace-user-id.py a1b2c3d4-e5f6-7890-abcd-ef1234567890
```

Ergebnis: Datei `backup_inserts_baleah.sql`

---

## Schritt 3: Import in Supabase SQL Editor

1. **Supabase Dashboard** → Baleah-Projekt → **SQL Editor**
2. Datei `backup_inserts_baleah.sql` öffnen
3. **Gesamten Inhalt** kopieren
4. Im SQL Editor einfügen und **Run** ausführen

---

## Fertig

Die Baleah-DB enthält jetzt alle Tabellen und Daten, verknüpft mit deinem neuen Baleah-User.
