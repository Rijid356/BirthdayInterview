# Plan: Build All Screens for Birthday Interview App

**Created:** 2026-02-09
**Status:** Complete
**Complexity:** L
**Execution:** Parallel Agents

## Goal

Complete the Birthday Interview app by building the 6 remaining screens (AddChild, ChildProfile, Interview, InterviewReview, YearCompare, Settings), wiring them into navigation, adding a `.gitignore`, and installing dependencies. The data layer, theme, questions, and HomeScreen are already done.

## Complexity Estimate

**Size: L**

- 6 screens to build, one of which (InterviewScreen) is complex with 3-phase camera/recording flow
- 8+ files to create/modify
- Patterns are well-established by the existing HomeScreen and CLAUDE.md spec

**Reasoning:** The InterviewScreen alone is M-sized due to camera recording + question overlay + answer entry phases. The other 5 screens are straightforward S-M work. Combined with navigation wiring, this is solidly L.

## Approach

Follow the architecture in CLAUDE.md exactly. Each screen follows the existing pattern set by HomeScreen: functional component, StyleSheet, use storage utils, COLORS/SIZES from theme. The InterviewScreen uses `CameraView` from expo-camera with `recordAsync()`/`stopRecording()`, and InterviewReviewScreen uses `<Video>` from expo-av.

## Steps

### Step 1: Add `.gitignore` and install dependencies
- **Files:** `.gitignore`, `package-lock.json` (generated)
- **Details:** Create standard Expo `.gitignore` (node_modules, .expo, dist, etc.). Run `npm install` to generate lock file and node_modules.

### Step 2: Build AddChildScreen
- **Files:** `src/screens/AddChildScreen.js`
- **Details:** Form with TextInput for name, date picker for birthday (MM/DD/YYYY format), emoji avatar picker (grid of ~20 emoji options). Uses `saveChild()` from storage. Generates ID with `Date.now().toString() + Math.random().toString(36).substr(2, 9)`. Navigates back on save.

### Step 3: Build ChildProfileScreen
- **Files:** `src/screens/ChildProfileScreen.js`
- **Details:** Receives `childId` param. Shows emoji, name, age (calculated from birthday). Lists past interviews sorted by year (newest first). "Start Interview" button navigates to Interview screen. "Compare Years" button appears if 2+ interviews exist. Long-press interview card for delete with confirmation alert. Calculates age from birthday.

### Step 4: Build InterviewScreen (complex)
- **Files:** `src/screens/InterviewScreen.js`
- **Details:** Three-phase screen:
  1. **Intro phase:** Camera preview using `CameraView` (mode="video", facing="front"), instructions text, flip camera button, "Start Recording" button.
  2. **Recording phase:** Full-screen camera. Semi-transparent dark panel at bottom shows current question text. Prev/Next buttons to cycle questions. Progress bar. "Stop Recording" button. `recordAsync()` on start, `stopRecording()` on stop.
  3. **Answer Entry phase:** After recording stops, cycle through questions with TextInput for each answer. Progress bar. "Save" button calls `moveVideoToStorage()` then `saveInterview()`. Navigate to InterviewReview on save.

### Step 5: Build InterviewReviewScreen
- **Files:** `src/screens/InterviewReviewScreen.js`
- **Details:** Receives `interviewId` param. Video player at top using `<Video>` from expo-av with `useNativeControls`. Below: Q&A cards grouped by category (using QUESTION_CATEGORIES). Each card shows question text and answer text. ScrollView layout.

### Step 6: Build YearCompareScreen
- **Files:** `src/screens/YearCompareScreen.js`
- **Details:** Receives `childId` param. Fetches all interviews for child, sorted chronologically (oldest first). For each question, shows a timeline row with the answer from each year. Category filter chips at top. ScrollView layout.

### Step 7: Build SettingsScreen
- **Files:** `src/screens/SettingsScreen.js`
- **Details:** Export button calls `exportAllData()` → `expo-sharing` shareAsync. Import section (could use DocumentPicker or paste JSON). App info/version display. Simple list layout.

### Step 8: Wire navigation in App.js
- **Files:** `App.js`
- **Details:** Import all 6 new screens. Add `Stack.Screen` entries for each. InterviewScreen gets `headerShown: false` and `gestureEnabled: false`. Other screens get appropriate titles. This step depends on all screens being built.

## Execution Strategy

**Mode:** Parallel Agents

Steps that can run independently are grouped into parallel batches:

| Batch | Steps | Why parallel |
|-------|-------|-------------|
| 1     | Step 1 (gitignore + deps) | Must happen first so linting/imports work |
| 2     | Steps 2, 3, 4, 5, 6, 7 | All 6 screens are independent files with no shared dependencies |
| 3     | Step 8 (navigation wiring) | Depends on all screens existing |

Within Batch 2, each screen is a separate file importing only from existing utils — no cross-screen dependencies.

## Open Questions

- **Date picker for AddChild:** Use a simple text input with MM/DD/YYYY validation, or a third-party date picker? Expo doesn't ship one natively. Recommend simple TextInput with format validation to avoid adding a dependency.
- **Import flow in Settings:** Use `expo-document-picker` (requires adding dependency) or a simpler paste-JSON-from-clipboard approach? Recommend keeping it simple with clipboard for v1.
- **Video recording limits:** Should there be a max recording time? The spec doesn't mention one — will leave unlimited for v1.

## Out of Scope

- Cloud backup (future enhancement per CLAUDE.md)
- Custom questions per child
- Photo capture alongside video
- Edit answers after saving
- Share as PDF/image
- Birthday reminder notifications
- App icon and splash screen assets

## Future Considerations

- The InterviewScreen state machine (intro → recording → answer entry) could be refactored into a custom hook if it gets unwieldy
- Consider `expo-document-picker` for a proper import flow in v2
- Video thumbnails for interview list cards would be a nice v2 addition
