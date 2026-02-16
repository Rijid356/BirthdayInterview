# Plan: Profile Pictures + Full Backup with Videos

**Status:** Completed
**Complexity:** L
**Execution Mode:** Parallel Agents

## Context

The user wants two enhancements:
1. **Profile pictures** for children (optional photo, emoji fallback) — currently only emoji avatars exist
2. **Full backup with videos** — current export is JSON-only (no video files), and import requires pasting JSON text

The balloon run "upload past video" feature already works via the "Choose from Gallery" button.

---

## Plan A: Profile Picture with Emoji Fallback

**Complexity: S** | **Strategy: Parallel Agent A**

### Goal
Optional photo upload on child profiles. Photo shows on ChildProfileScreen; emoji stays on HomeScreen cards.

### Steps

**Step 1: Add photo storage functions to `src/utils/storage.js`**
- Add `PROFILE_PHOTO_DIR` constant (`${FileSystem.documentDirectory}profile-photos/`)
- Add `saveProfilePhoto(childId, pickedUri)` — ensures dir exists, copies image to `profile_${childId}.jpg`, updates child record with `photoUri` field
- Add `deleteProfilePhoto(childId)` — deletes photo file, removes `photoUri` from child record
- Update `deleteChild()` (line 24) to also delete profile photo file when it exists

**Step 2: Update `src/screens/ChildProfileScreen.js`**
- Import `Image` from react-native, `ImagePicker` from expo-image-picker
- Import `saveProfilePhoto`, `deleteProfilePhoto` from storage
- Modify `emojiContainer` in `ListHeader` (line 139-142):
  - If `child.photoUri` exists, render `<Image>` (96x96 circle) instead of emoji
  - Otherwise render emoji as current fallback
- Wrap avatar in `<TouchableOpacity>` with `handleAvatarPress()`:
  - No photo set: Alert with "Choose Photo" / "Cancel"
  - Photo set: Alert with "Change Photo" / "Remove Photo" / "Cancel"
  - Uses `ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8 })`
- Add small camera icon overlay (bottom-right of avatar circle) to indicate tappability
- Add `profilePhoto` style (96x96, borderRadius 48)

**Step 3: Update `src/screens/AddChildScreen.js`**
- Add optional "Add Photo" section below emoji picker
- State: `const [photoUri, setPhotoUri] = useState(null)`
- Show small preview circle if photo picked, tap to pick/remove
- In `handleSave()`: after `saveChild(child)`, call `saveProfilePhoto(child.id, photoUri)` if set

**Step 4: Update `app.json`**
- Change `expo-image-picker` photosPermission to: "Allow Berfdayy to access your photo library to select photos and videos."

### Files Modified
- `src/utils/storage.js` — photo CRUD + cleanup in deleteChild
- `src/screens/ChildProfileScreen.js` — photo display + edit UI
- `src/screens/AddChildScreen.js` — optional photo during creation
- `app.json` — permission string update

---

## Plan B: Full Backup with Videos

**Complexity: L** | **Strategy: Parallel Agent B**

### Goal
Export a `.zip` file containing JSON metadata + all video files + profile photos. Import by picking a file (`.zip` or legacy `.json`).

### New Dependencies
- `jszip` — pure JS zip creation/extraction (works in Expo managed, no native modules)
- `expo-document-picker` — file picker for import (included in Expo Go)

### Steps

**Step 1: Install dependencies**
- `npm install jszip expo-document-picker`
- Add `expo-document-picker` to `app.json` plugins array

**Step 2: Add full backup functions to `src/utils/storage.js`**
- Add `getMediaManifest()` — scans all interviews, balloon runs, and children for `videoUri`/`photoUri` fields; returns `[{ type, relativePath, absoluteUri }]` for each existing file
- Add `exportFullBackup(onProgress)`:
  - Gathers metadata via `exportAllData()`
  - Calls `getMediaManifest()` to find all media files
  - Creates JSZip instance
  - Adds `metadata.json` (metadata + manifest mapping)
  - For each media file: reads as base64 via `FileSystem.readAsStringAsync`, adds to zip under `media/` folder
  - Calls `onProgress(current, total, filename)` per file
  - Generates zip as base64, writes to `${documentDirectory}berfdayy-full-backup.zip`
  - Returns file URI
- Add `importFullBackup(zipUri, onProgress)`:
  - Reads zip as base64 via `FileSystem.readAsStringAsync`
  - Loads into JSZip, extracts `metadata.json`
  - For each media file in manifest: extracts base64, writes to correct local directory (interview-videos/, balloon-run-videos/, profile-photos/)
  - Remaps `videoUri`/`photoUri` in metadata to new local paths
  - Saves metadata to AsyncStorage
  - Returns summary `{ children, interviews, balloonRuns }`

**Step 3: Update `src/screens/SettingsScreen.js`**
- Import `DocumentPicker` from expo-document-picker
- Import `exportFullBackup`, `importFullBackup` from storage

- **Export section** (replace lines 146-164):
  - Two buttons: "Export Data Only (JSON)" (current behavior) and "Full Backup (with videos)"
  - Full backup shows progress: "Processing video 3 of 7..." with ActivityIndicator
  - Add progress state: `{ active, phase, current, total, filename }`

- **Import section** (replace lines 166-218):
  - Replace "Paste Backup Data" with "Import from File" button
  - Uses `DocumentPicker.getDocumentAsync({ type: ['application/json', 'application/zip', '*/*'] })`
  - Auto-detects format from file extension
  - `.json` → legacy import path (read file, parse JSON, import metadata)
  - `.zip` → full import via `importFullBackup()` with progress UI
  - Keep "Paste JSON" as secondary/fallback option
  - Show import progress for zip files

**Step 4: Add backup size estimate to Data Overview**
- Scan video directories for total file size
- Display estimated backup size (e.g., "Estimated backup size: 247 MB") below the stats

### Files Modified
- `package.json` — add jszip, expo-document-picker
- `app.json` — add expo-document-picker plugin
- `src/utils/storage.js` — getMediaManifest, exportFullBackup, importFullBackup
- `src/screens/SettingsScreen.js` — dual export buttons, file picker import, progress UI

### Zip Structure
```
berfdayy-full-backup.zip
├── metadata.json          (children + interviews + balloonRuns + manifest)
├── media/
│   ├── interview_<id>_<ts>.mp4
│   ├── balloon_<id>_<ts>.mp4
│   └── profile_<childId>.jpg
```

### Memory Considerations
- Large videos (100MB+) read as base64 strings will use ~133% of the original file size in memory
- Show a warning if total media size exceeds 500MB suggesting data-only export instead
- Wrap each file read in try/catch so one bad file doesn't block the entire backup

---

## Execution Strategy: Parallel Agents

**Two agents run in parallel** via git worktrees:

| Agent | Feature | Branch | Worktree |
|-------|---------|--------|----------|
| A | Profile Pictures | `feature/profile-pictures` | Isolated worktree |
| B | Full Backup with Videos | `feature/full-backup` | Isolated worktree |

### Shared Files (merge conflict risk)
Both agents modify these files:
- **`src/utils/storage.js`** — Agent A adds photo CRUD; Agent B adds backup functions. Both add to different sections, low conflict risk.
- **`app.json`** — Agent A updates image-picker permission; Agent B adds document-picker plugin. Different sections, low conflict risk.

### Integration After Merge
Once both branches are merged, a quick follow-up ensures Plan B's `getMediaManifest()` includes profile photos from Plan A (if not already handled during merge).

## Verification

### Profile Pictures
- Create child without photo → emoji shows on profile and home
- Add photo from ChildProfileScreen → photo in profile circle, emoji on home card
- Change photo → new photo replaces old
- Remove photo → reverts to emoji
- Delete child → profile photo file cleaned from disk

### Full Backup
- Export with no media → zip contains only `metadata.json`
- Export with videos + photos → zip contains all media files
- Import `.json` file → backward compatible, works as before
- Import `.zip` file → extracts videos/photos, metadata loads, playback works
- Round-trip: export → clear app data → import → everything restored
