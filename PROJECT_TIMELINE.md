# Project Timeline

## Phase: Initial Build
**Date:** Feb 10, 2026 to Feb 10, 2026
**Duration:** 1 day

Originally called "Berfdayy," this React Native (Expo) app was built to capture and archive birthday moments for kids year over year. Scaffolded from Claude mobile planning notes, built all core screens and upgraded to Expo SDK 54 on day one. Added birthday input formatting with auto-validation and E2E test infrastructure.

### Highlights
- Scaffolded from mobile planning notes
- All core screens built on day one
- Expo SDK 54 with React Native
- Birthday input with auto-formatting
- E2E test infrastructure setup

### Metrics
- **Time to All Screens:** 1 day
- **PRs Merged:** 2
- **Framework:** React Native (Expo SDK 54)

---

## Phase: Video Features & Balloon Run
**Date:** Feb 11, 2026 to Feb 12, 2026
**Duration:** 2 days

Added the fun features that make the app special. Birthday interviews with video recording, camera flip, timestamps, and overlay graphics. Video save and share functionality. The Balloon Run mini-game — a birthday party activity feature. Removed the answer phase and added question prompts, then renamed to Berfdayy.

### Highlights
- Birthday interview video recording with camera flip
- Video timestamps and overlay graphics
- Save/share functionality for recorded videos
- Balloon Run mini-game feature
- Android build support
- Transcription and enrichment features

### Metrics
- **PRs Merged:** 3
- **Features Added:** Video recording, Balloon Run, transcription

---

## Phase: Media & Birthday Content
**Date:** Feb 13, 2026 to Feb 13, 2026
**Duration:** 1 day

Added birthday media upload with gallery integration and backup. Profile pictures for each child. Full video backup support with camera roll save. Dealt with Android-specific video save issues across multiple approaches (MediaLibrary → Sharing → createAssetAsync). Renamed the project from Berfdayy to git-bigger.

### Highlights
- Birthday media upload with gallery and backup
- Profile pictures for children
- Full video backup with camera roll integration
- Fixed Android video save across multiple approaches
- Project renamed from Berfdayy to git-bigger
- Friendly video filenames for share/save

### Metrics
- **PRs Merged:** 5
- **Android Fixes:** 3 iterations on video save

---

## Phase: Year-Based Profiles & Polish
**Date:** Feb 13, 2026 to Feb 16, 2026
**Duration:** 4 days

Restructured the child profile from flat categories to a year-based view — each birthday year is its own section with interviews, photos, and media. Added environment variable management for API keys, a birthday cake app icon, visible delete buttons on cards, and organized all plans into an archive.

### Highlights
- Year-based profile restructure (each birthday year is a section)
- Environment variable management for API keys
- Birthday cake app icon for Android
- Visible trash can delete buttons on cards
- Plan files organized into implemented/ archive

### Metrics
- **Total PRs Merged:** 15
- **Architecture:** Year-based birthday timeline per child
- **Platform:** Android with Expo SDK 54
