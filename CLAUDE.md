# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Berfdayy** — A React Native (Expo) mobile app for recording annual birthday interviews with children. Parents ask questions each year while recording a continuous video. The video IS the interview — no text answer entry. Old interviews with text answers are still displayed for backward compatibility.

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
- **Storage**: AsyncStorage (keys: `@birthday_interview_children`, `@birthday_interview_sessions`)
- **Video**: expo-camera (CameraView) for recording, expo-av (Video) for playback
- **File System**: expo-file-system for video storage in `${documentDirectory}interview-videos/`
- **E2E**: Playwright (Chromium) against Expo web build on port 19006

## Architecture

### Screen Flow

```
HomeScreen ──→ AddChildScreen
    │
    ├──→ ChildProfileScreen ──→ InterviewScreen (2-phase flow)
    │         │                       │
    │         ├──→ InterviewReviewScreen (video + Q&A review)
    │         └──→ YearCompareScreen (cross-year answer timeline)
    │
    └──→ SettingsScreen (export/import JSON backup)
```

### InterviewScreen Phases

Two sequential phases in a single screen component:
1. **Intro** — Camera preview, instructions, "Start Recording" button
2. **Recording** — Full-screen camera, question prompt overlay, Prev/Next navigation, Stop button. `CameraView.recordAsync()` runs continuously. When stopped, video is saved automatically and navigates to InterviewReview (no text answer entry).

### Data Flow Pattern

All screens use the same pattern:
- `useFocusEffect` → load data from AsyncStorage on screen focus
- Local `useState` for screen state (no global state management)
- Storage utility functions in `src/utils/storage.js` for all CRUD
- Navigation params pass IDs between screens (e.g., `childId`, `interviewId`)

### Data Models

**Child**: `{ id, name, birthday (ISO), emoji, createdAt }`
**Interview**: `{ id, childId, year, age, date, questions[], answers{}, videoUri, createdAt }`

IDs: `Date.now().toString() + Math.random().toString(36).substr(2, 9)`

### Questions (src/data/questions.js)

22 default questions in 6 categories (basics, favorites, people, dreams, reflections, fun). Each question: `{ id: 'q1', text: '...', category: 'favorites' }`. Categories have labels and emoji. Questions are not yet user-customizable.

## Key Implementation Notes

- Use `CameraView` from expo-camera (not the deprecated `Camera` component)
- Camera `mode="video"`, `facing="front"` by default with flip button
- Video playback uses `<Video>` from expo-av with `useNativeControls`
- Long-press on interview cards for delete actions with confirmation alerts
- Year comparison sorts interviews chronologically (oldest first)
- Export/import is JSON only — video files are NOT included in backups
- `testID` props on key form elements render as `data-testid` in web (used by Playwright)

## E2E Testing

Playwright tests run against the Expo web build (`react-native-web`). The web server auto-starts on port 19006 via the Playwright config.

**Current test coverage**: `e2e/add-child-birthday.spec.js` — 9 tests for birthday input validation on AddChildScreen.

**Known limitation**: `keyboardType="number-pad"` maps to `inputmode="numeric"` on web which does NOT restrict character input. On mobile, number-pad keyboards may not expose the `/` character needed for MM/DD/YYYY. The E2E tests validate web behavior; manual testing on device is needed for mobile keyboard behavior.

## Design

- Warm celebratory palette: primary #FF6B8A (pink), accent #FFB347 (gold)
- Theme constants in `src/utils/theme.js` (COLORS and SIZES objects)
- Rounded cards with soft shadows, child-friendly but parent-operated UI
- Recording screen: camera fills screen, dark semi-transparent overlay for question prompts

## Future Enhancements (not in v1)

- Cloud backup (Google Drive / Firebase)
- Custom questions per child
- Auto-formatting birthday input (slash insertion)
- Edit answers after saving
- Share interview summary as PDF/image
- Birthday reminder notifications
