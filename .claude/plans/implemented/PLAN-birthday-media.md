# Plan: Birthday Media Upload

**Status:** In Progress
**Complexity:** M
**Strategy:** Solo

## Context
The app currently captures birthday memories only through interview recordings (camera) and balloon runs. Users want to upload their own photos and videos from the actual birthday — party pics, cake moments, family photos, etc. This adds a media gallery feature organized by year, accessible both as a preview on the child profile and as a full dedicated gallery screen.

## Steps

### 1. Storage layer — `src/utils/storage.js`

Add new storage key, directory, and CRUD functions following the existing balloon runs pattern:

```
BIRTHDAY_MEDIA_KEY = '@git-bigger_birthday_media'
BIRTHDAY_MEDIA_DIR = ${documentDirectory}birthday-media/
```

**Data model:**
```js
{
  id, childId, year, age,
  type: 'photo' | 'video',
  uri: string,          // persistent path in birthday-media/
  width: number,        // from ImagePicker asset
  height: number,       // from ImagePicker asset
  createdAt: string
}
```

**New functions:**
- `getBirthdayMedia()` — get all
- `getBirthdayMediaForChild(childId)` — filtered + sorted by year desc
- `saveBirthdayMediaItems(items[])` — batch save after multi-select pick
- `deleteBirthdayMediaItem(mediaId)` — delete record + file
- `moveToBirthdayMediaStorage(tempUri, filename)` — copy picked file to persistent dir

**Update existing functions:**
- `deleteChild()` — add cleanup block for birthday media (files + metadata), same pattern as balloon runs
- `exportAllData()` — add `birthdayMedia` to return object
- `importData()` — handle `data.birthdayMedia` key
- `getMediaManifest()` — loop birthday media items, add with `type: 'birthday-media'`
- `importFullBackup()` — add `BIRTHDAY_MEDIA_DIR` to dirs array, handle `type === 'birthday-media'` in path mapping, remap `uri` in `data.birthdayMedia`
- `getBackupSizeEstimate()` — add `BIRTHDAY_MEDIA_DIR` to directories array

### 2. New screen — `src/screens/BirthdayGalleryScreen.js`

**Route params:** `{ childId }`

**Layout:**
- `SectionList` grouped by year (newest first)
- **Year header row:** "2026 — Age 5" left, "+ Add" pill button right
- **Media grid:** 3-column grid of square thumbnails per section
  - Photos: `<Image>` with `resizeMode="cover"`
  - Videos: colored placeholder with play icon overlay
- **Long-press** any thumbnail → delete confirmation Alert
- **Tap** thumbnail → full-screen modal viewer:
  - Photos: full-screen Image on black bg + close button
  - Videos: `<Video>` from expo-av with `useNativeControls` on black bg
- **"+ Add" per year:** launches `ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images', 'videos'], allowsMultipleSelection: true, quality: 0.8 })`, pre-assigns that year
- **Header "+" button:** for adding media to a year that doesn't have a section yet — shows year picker
- **Empty state:** camera emoji + "No birthday media yet!" + "Add Photos & Videos" button

**Styling:** Match existing warm palette — surface cards, radiusLg, soft shadows. Use a green-tinted accent (`#7DD3A8`) for the media section.

### 3. Register route — `App.js`

- Import `BirthdayGalleryScreen`
- Add `<Stack.Screen name="BirthdayGallery" component={BirthdayGalleryScreen} options={{ title: 'Birthday Media' }} />`

### 4. Profile preview section — `src/screens/ChildProfileScreen.js`

Add a "Birthday Media" section in `ListFooterComponent` after the Balloon Runs section:

- **Section header:** "Birthday Media" + count
- **Preview strip:** Horizontal `ScrollView` of most recent ~8 thumbnails (72x72 squares), with a "See All ›" card at the end → navigates to `BirthdayGalleryScreen`
- **Empty state:** camera emoji + "Add birthday photos & videos" + tappable to navigate to gallery
- **Data loading:** Add `getBirthdayMediaForChild(childId)` call in `loadData`, new `birthdayMedia` state

### 5. Settings screen — `src/screens/SettingsScreen.js`

Add birthday media count to the "Your Data" stats section.

## Files to Modify
| File | Change |
|------|--------|
| `src/utils/storage.js` | New key, dir, 5 CRUD functions, update 6 existing functions |
| `src/screens/BirthdayGalleryScreen.js` | **New file** — full gallery with year sections, grid, viewer modal |
| `App.js` | Add BirthdayGallery route |
| `src/screens/ChildProfileScreen.js` | Add media preview section + state + import |
| `src/screens/SettingsScreen.js` | Add media count stat |
