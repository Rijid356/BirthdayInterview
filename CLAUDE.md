# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Berfdayy (git-bigger)** — A React Native (Expo) mobile app for capturing birthday memories. Core features: annual video interviews with children, slow-motion balloon run videos, and birthday photo/video galleries. All content is organized by year per child.

## Commands

```bash
# Development (Expo Go on device)
npm start                    # Start Expo dev server, scan QR with Expo Go
npm run android              # Launch on Android emulator/device
npm run ios                  # Launch on iOS simulator/device
npm run web                  # Start Expo web server

# E2E Tests (Playwright against Expo web build)
npm run test:e2e             # Run all E2E tests headless
npm run test:e2e:headed      # Run with visible browser
npx playwright test e2e/add-child-birthday.spec.js  # Run single test file
npx playwright test -g "Valid date"                  # Run tests matching name
```

**Important**: This project uses **Expo Go** (managed workflow), not dev builds. There is no `npx expo prebuild` or native code. All testing on physical devices goes through the Expo Go app.

## Tech Stack

- **Expo SDK 54** (managed workflow), React Native 0.81, React 19
- **Navigation**: @react-navigation/native v7 + native-stack
- **Storage**: AsyncStorage (no global state — all screens load on focus)
- **Video**: expo-camera (CameraView) for recording, expo-av (Video) for playback
- **Media**: expo-image-picker for gallery uploads, expo-media-library for camera roll saves
- **Backup**: jszip for full media ZIP export/import
- **File System**: expo-file-system — videos in `interview-videos/`, balloon runs in `balloon-run-videos/`, media in `birthday-media/`, profile photos in `profile-photos/` (all under `documentDirectory`)
- **E2E**: Playwright (Chromium) against Expo web build on port 19006

## Architecture

### Screen Flow

```
HomeScreen ──→ AddChildScreen
    │
    ├──→ ChildProfileScreen (year-based cards, profile photo)
    │         │
    │         └──→ YearDetailScreen (all content for one year)
    │                   │
    │                   ├──→ InterviewScreen ──→ InterviewReviewScreen
    │                   ├──→ BalloonRunCaptureScreen ──→ BalloonRunViewScreen
    │                   ├──→ BirthdayGalleryScreen
    │                   └──→ YearCompareScreen (cross-year timeline)
    │
    └──→ SettingsScreen (full backup export/import with ZIP)
```

### Key Screen Behaviors

**ChildProfileScreen** — Year-based layout. Each year card shows badges for existing content (🎥 Interview, 🎈 Balloon Run, 📸 N media). Tap a year → YearDetailScreen.

**InterviewScreen** — Two-phase flow: Intro (camera preview + "Start Recording") → Recording (full-screen camera, question prompt overlay, Prev/Next navigation). `CameraView.recordAsync()` runs continuously. Records `questionTimestamps` for when each question was shown.

**BalloonRunCaptureScreen** — Three-phase flow: Choose mode (record or pick from gallery) → Recording → Preview with speed selector (0.25x–1.0x).

**BirthdayGalleryScreen** — 3-column grid organized by year, full-screen viewer modal, multi-select upload via expo-image-picker.

**InterviewReviewScreen** — Video playback with question overlays synced to timestamps. Supports auto-transcribed answers (via OpenAI Whisper), editable answers, Spotify card for favorite song, and enrichment badges.

### Data Flow Pattern

All screens follow the same pattern:
- `useFocusEffect` → load from AsyncStorage on screen focus
- Local `useState` for screen state (no global state management)
- Storage utility functions in `src/utils/storage.js` for all CRUD
- Navigation params pass IDs between screens (e.g., `childId`, `interviewId`, `year`)

### Data Models

**Child**: `{ id, name, birthday (ISO), emoji, photoUri, createdAt }`

**Interview**: `{ id, childId, year, age, date, questions[], answers{}, videoUri, questionTimestamps[], transcription{}, spotify{}, enrichment{}, createdAt }`
- `answers` values are objects: `{ text, source: 'auto'|'edited', editedAt }`
- `transcription`: `{ status, rawSegments, error, completedAt }`
- `spotify`: `{ trackId, trackName, artistName, albumArt, previewUrl, spotifyUri }`

**BalloonRun**: `{ id, childId, year, age, videoUri, playbackRate, createdAt }`

**BirthdayMedia**: `{ id, childId, year, age, type: 'photo'|'video', uri, width, height, createdAt }`

IDs: `Date.now().toString() + Math.random().toString(36).substr(2, 9)`

### Storage Keys

| Key | Content |
|-----|---------|
| `@birthday_interview_children` | All children |
| `@birthday_interview_sessions` | All interviews |
| `@git-bigger_balloon_runs` | Balloon run videos |
| `@git-bigger_birthday_media` | Gallery photos/videos |
| `@berfdayy_api_keys` | OpenAI/Spotify API credentials |

### Questions (src/data/questions.js)

22 default questions in 6 categories (basics, favorites, people, dreams, reflections, fun). Some questions have `enrichable: true` with `enrichmentType` for auto-tagging. Question q5 (favorite song) has `spotifySearch: true`.

### Utility Modules

- **storage.js** — All AsyncStorage CRUD, year summaries (`getYearSummariesForChild`), full backup ZIP export/import, cascade deletes
- **enrichment.js** — Keyword-based emoji and color tag enrichment for answers
- **transcription.js** — OpenAI Whisper integration, segment-to-question mapping
- **spotify.js** — Spotify API (Client Credentials), track search, token caching
- **native-modules.js / .web.js** — Platform-specific module loading (real exports on native, null stubs on web)
- **theme.js** — COLORS and SIZES constants

## Key Implementation Notes

- Use `CameraView` from expo-camera (not the deprecated `Camera` component)
- Camera `mode="video"`, `facing="front"` by default with flip button
- Both InterviewScreen and BalloonRunCaptureScreen follow a multi-phase camera flow pattern
- Trash can icons on interview and balloon run cards for delete (with confirmation alerts)
- Full backup creates ZIP with all media files — not just JSON metadata
- `deleteChild()` cascades to interviews, balloon runs, media, and profile photos
- `testID` props on key form elements render as `data-testid` in web (used by Playwright)
- Native modules are abstracted via platform-specific files for web compatibility

## E2E Testing

Playwright tests run against the Expo web build (`react-native-web`). The web server auto-starts on port 19006 via the Playwright config.

**Test files:**
- `add-child-birthday.spec.js` — Birthday input validation on AddChildScreen
- `interview-review-video.spec.js` — InterviewReviewScreen video features and question overlays
- `balloon-run-visual.spec.js` — Balloon run UI visual regression (Pixel 9 viewport)

Tests seed AsyncStorage with test data and use public domain test videos.

**Known limitation**: `keyboardType="number-pad"` maps to `inputmode="numeric"` on web which does NOT restrict character input. E2E tests validate web behavior; manual testing on device needed for mobile keyboard behavior.

## Design

- Warm celebratory palette: primary #FF6B8A (pink), accent #FFB347 (gold), Spotify green #1DB954
- Theme constants in `src/utils/theme.js` (COLORS and SIZES objects)
- Rounded cards with soft shadows, child-friendly but parent-operated UI
- Recording screens: camera fills screen, dark semi-transparent overlay for prompts
- Year-based organization with content type badges

## Future Enhancements

- Cloud backup (Google Drive / Firebase)
- Custom questions per child
- Auto-formatting birthday input (slash insertion)
- Share interview summary as PDF/image
- Birthday reminder notifications
- LLM-powered enrichment (replacing keyword-based)
- Question overlay burn-in to video export
