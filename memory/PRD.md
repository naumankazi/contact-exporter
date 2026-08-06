# PRD — VCF Contacts Export

## Original Problem Statement
Mobile app to export phone contacts as a VCF (vCard) file. On launch, request permission to access device contacts. Show a searchable list of all contacts with a "Select All" toggle. Generate a standard VCF containing selected contacts' name + phone numbers. Provide an "Export" button that opens the native share sheet (iOS/Android) to save to Files, email, or message. All processing local — no external server.

## Architecture
- **Frontend-only** Expo (SDK 54) app, expo-router file-based routing. No backend, no database — 100% on-device.
- Native modules: `expo-contacts` (read), `expo-file-system` (write .vcf to cache), `expo-sharing` (native share sheet), `expo-haptics`, `expo-blur`, `expo-linear-gradient`, `expo-image`.
- Design: "iOS-Native Clean" personality, Moss Green (#4F6B56) accent, light/dark aware.

## User Persona
- Anyone migrating/backing up contacts who wants a quick, private way to export selected contacts as a standard .vcf.

## Core Requirements (static)
- Contacts permission with proper pre-permission explainer + denied/Open-Settings handling.
- Searchable contact list, per-contact multi-select, Select All (scoped to current search).
- Standard vCard 3.0 generation (FN, N, TEL) with escaping + multi-phone support.
- Native share sheet export with auto-named file `contacts_YYYY-MM-DD.vcf`.
- Fully local; no network calls with contact data.

## Implemented (2026-06-06)
- `src/vcf.ts` — vCard 3.0 generator + auto filename (validated: escaping, multi-phone, multi-contact).
- `src/theme.ts` — design tokens (colors/spacing/radius/typography).
- `src/components/ContactRow.tsx` — 60pt row, initials avatar, name+phone, check toggle.
- `app/index.tsx` — permission flow (loading/needs-permission/denied/ready), search, select-all, sticky glass export bar, toast feedback, haptics, empty states with gradient-scrim image.
- `app/_layout.tsx` — GestureHandlerRootView + SafeAreaProvider + StatusBar.
- `app.json` — contacts permission (iOS infoPlist + Android READ_CONTACTS + expo-contacts plugin).

## Backlog
- P1: Group list by first letter with section headers + A–Z index.
- P2: Include emails/addresses in VCF (currently name+phone only, per user choice).
- P2: Contact count badge / recently-exported history.

## Notes
- Contacts read + export are **native-only** — must be tested in Expo Go on a real device; the web preview shows only the permission screen and cannot access device contacts.
