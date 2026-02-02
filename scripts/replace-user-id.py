#!/usr/bin/env python3
"""
Ersetzt ALLE alten User-IDs durch die neue Baleah-User-ID im Backup.
Usage: python replace-user-id.py <NEUE_USER_UUID> [input.sql] [output.sql]
"""
import re
import sys

# Alle User-IDs aus user_profiles (referenzieren auth.users)
OLD_USER_IDS = [
    "3f1d0400-014f-4278-8f51-f12fb965948b",
    "fdff79df-6376-48ed-99ff-aa8f7f1bc6a5",
    "31c9b600-69f2-4acd-9bf4-2192221f3f98",
    "4a4c3a94-58dc-4fbf-ad27-3609e5ac0f55",
    "77e10f89-a6e1-4f41-9a2f-24adef11c770",
    "1bcc7bc0-e824-4b06-a52c-0119ab36dc7f",
    "a994ceff-7d67-40ef-82d4-cf16410ad17b",
]

def main():
    if len(sys.argv) < 2:
        print("Usage: python replace-user-id.py <NEUE_USER_UUID>")
        print("Beispiel: python replace-user-id.py abc12345-6789-...")
        sys.exit(1)

    new_user_id = sys.argv[1].strip().lower()
    if len(new_user_id) != 36 or new_user_id.count("-") != 4:
        print("Fehler: Ungültige UUID. Format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx")
        sys.exit(1)

    input_file = sys.argv[2] if len(sys.argv) > 2 else "backup_inserts.sql"
    output_file = sys.argv[3] if len(sys.argv) > 3 else "backup_inserts_baleah.sql"

    with open(input_file, "r", encoding="utf-8") as f:
        content = f.read()

    total = 0
    for old_id in OLD_USER_IDS:
        count = content.count(old_id)
        content = content.replace(old_id, new_user_id)
        total += count
        if count:
            print(f"  {old_id}: {count} Vorkommen")

    # Duplikate bei user_profiles entfernen (alle haben jetzt gleiche id → nur 1 behalten)
    pattern = r"INSERT INTO public\.user_profiles \([^)]+\) VALUES \([^;]+\);"
    matches = list(re.finditer(pattern, content))
    if len(matches) > 1:
        for m in reversed(matches[1:]):
            content = content[: m.start()] + content[m.end() :]

    # Duplikate bei company_members entfernen (company_id, user_id) unique
    pattern = r"INSERT INTO public\.company_members \([^)]+\) VALUES \([^;]+\);"
    matches = list(re.finditer(pattern, content))
    seen = set()
    to_remove = []
    for m in matches:
        vals = re.search(r"VALUES \('([^']+)', '([^']+)', '([^']+)'", m.group(0))
        if vals:
            key = (vals.group(2), vals.group(3))  # company_id, user_id
            if key in seen:
                to_remove.append(m)
            else:
                seen.add(key)
    for m in reversed(to_remove):
        content = content[: m.start()] + content[m.end() :]

    with open(output_file, "w", encoding="utf-8") as f:
        f.write(content)

    print(f"\nGesamt: {total} User-IDs ersetzt → {new_user_id}")
    print(f"Gespeichert: {output_file}")


if __name__ == "__main__":
    main()
