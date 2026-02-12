# Plan: Balloon Run Feature

**Status:** In Progress
**Complexity:** M
**Execution Mode:** Solo

## Context

Every year on the kids' birthdays, the family makes a hallway of balloons for them to run through. This feature lets parents capture that moment — either by recording directly in the app or uploading an existing video (e.g. one shot in the phone's native slo-mo mode) — and view it back in slow motion. Balloon runs are stored per child per year, independent from interviews.

## Technical Approach

**Slow motion strategy**: expo-camera CameraView doesn't support high frame rate recording (120/240fps), but expo-av's `Video` component supports a `rate` prop (0.0–32.0x). We'll play videos back at reduced speed (default 0.5x) with a speed selector. Users who want true smooth slo-mo can record with their phone's native camera in slo-mo mode, then upload via gallery picker.

**New dependency**: `expo-image-picker` (for video gallery selection). Everything else is already installed.

## Data Model

New storage key: `@berfdayy_balloon_runs`

```js
{
  id: string,           // Date.now() + random (same pattern as existing IDs)
  childId: string,
  year: number,
  age: number,
  videoUri: string,     // stored in documentDirectory/balloon-run-videos/
  playbackRate: number, // default 0.5, persisted per run
  createdAt: string     // ISO date
}
```

## Files to Create

### 1. `src/screens/BalloonRunCaptureScreen.js`
Entry point from ChildProfileScreen. Three-phase state machine:
- **Choose mode** — Two buttons: "Record Video" and "Choose from Gallery". Tip text encouraging native slo-mo recording + upload for best quality.
- **Recording** — CameraView with `mode="video"`, `facing="back"` (parent films child), flip button, start/stop controls, timer display. Same permission pattern as InterviewScreen (`useCameraPermissions` + `useMicrophonePermissions`).
- **Preview** — Video player at selected slow-mo speed with SpeedSelector, Save + Discard buttons.

Nav params: `{ childId, childName }`
Options: `headerShown: false, gestureEnabled: false` (full-screen camera experience)

### 2. `src/screens/BalloonRunViewScreen.js`
View a saved balloon run. Layout:
- Video player (expo-av Video, `rate` from saved `playbackRate`, `useNativeControls`)
- SpeedSelector row (changing speed persists via `updateBalloonRun`)
- Action buttons: Save to Camera Roll, Share
- Metadata card: child emoji + name, year, age, date
- Delete button with confirmation alert

Nav params: `{ balloonRunId }`

### 3. `src/components/SpeedSelector.js`
Reusable speed pill selector used by both screens.
- Props: `{ selectedRate, onRateChange }`
- Rates: `[0.25, 0.5, 0.75, 1.0]`
- Selected pill: `COLORS.accent` fill, white text. Unselected: `COLORS.surface` with accent border.

## Files to Modify

### 4. `src/utils/storage.js`
- Add `BALLOON_RUNS_KEY` constant
- Add `BALLOON_VIDEO_DIR` (`documentDirectory/balloon-run-videos/`)
- Add CRUD: `getBalloonRuns()`, `getBalloonRunsForChild(childId)`, `saveBalloonRun()`, `updateBalloonRun()`, `deleteBalloonRun()` — same patterns as interview CRUD
- Add `moveVideoToBalloonStorage(tempUri, filename)` — same as `moveVideoToStorage` but targets balloon directory
- Update `deleteChild()` to also delete child's balloon runs + their video files
- Update `exportAllData()` to include `balloonRuns`
- Update `importData()` to handle `data.balloonRuns`

### 5. `App.js`
Register two new screens in the stack navigator:
- `BalloonRunCapture` (headerShown: false, gestureEnabled: false)
- `BalloonRunView` (title: 'Balloon Run')

### 6. `src/screens/ChildProfileScreen.js`
- Add `balloonRuns` state, load via `getBalloonRunsForChild` in `loadData`
- Add "Balloon Run" button in actions row (accent/gold colored, alongside "Start Interview")
- Add `ListFooterComponent` with:
  - "Balloon Runs" section header with count
  - Balloon run cards (year, age badge in accent color, date, chevron) — tap to view, long-press to delete
  - Empty state text if no runs yet
- Import new storage functions

### 7. `src/screens/SettingsScreen.js`
- Add balloon run count to data overview card
- Import `getBalloonRuns` from storage

### 8. `app.json`
- Add `expo-image-picker` plugin with photo library permission string

## Implementation Order

```
Wave 1 (sequential — foundation):
  Step 1: Install expo-image-picker, update app.json
  Step 2: storage.js — balloon run CRUD + video storage + export/import
  Step 3: SpeedSelector.js component

Wave 2 (parallel — screens + integration):
  Step 4a: BalloonRunCaptureScreen.js
  Step 4b: BalloonRunViewScreen.js
  Step 5:  App.js — register screens
  Step 6:  ChildProfileScreen.js — button + section
  Step 7:  SettingsScreen.js — balloon run count
```

## Key Patterns to Reuse

- **Camera recording**: Copy from `InterviewScreen.js` — CameraView setup, permission hooks, recordAsync/stopRecording flow
- **Video playback + share/save**: Copy from `InterviewReviewScreen.js` — Video component, MediaLibrary.saveToLibraryAsync, Sharing.shareAsync
- **Storage CRUD**: Follow exact patterns in `storage.js` — getAll, getForChild (sorted by year desc), save (upsert), update (merge), delete (with video file cleanup)
- **Card + section styling**: Match `interviewCard` styles from ChildProfileScreen, but use `COLORS.accent`/`COLORS.accentDark` instead of primary pink
- **Data loading**: `useFocusEffect` + `useCallback` + local `useState`

## Notes

- Video file extension: Preserve original extension from source URI (iOS may return `.MOV` from gallery)
- Multiple runs per child per year: Allowed (user might re-record)
- `shouldCorrectPitch={false}` on Video — pitch correction not needed for ambient slo-mo audio
