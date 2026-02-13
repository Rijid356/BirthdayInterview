# Plan: Friendly Video Filenames for Share/Save

**Created:** 2026-02-12
**Status:** Completed
**Complexity:** S
**Execution:** Solo

## Goal

When sharing or saving an interview video, use a human-readable filename like `Emma's 1st Birthday Interview.mp4` instead of the internal `interview_abc123_1707000000.mp4`. Internal storage filenames stay unchanged.

## Context

Currently both "Save to Camera Roll" and "Share Video" in InterviewReviewScreen pass the raw internal video URI directly to `MediaLibrary.saveToLibraryAsync()` and `Sharing.shareAsync()`. The internal filename is machine-generated (`interview_${childId}_${timestamp}.mp4`). The child's name and interview age are already loaded in component state, so all data needed for a friendly filename is available.

## Complexity Estimate

**Size: S**

**Reasoning:** 2 files, ~30 lines of new code, straightforward logic with no architectural changes.

## Approach

Add ordinal formatting and temp-copy helpers to `storage.js`, then update the two handlers in `InterviewReviewScreen.js` to create a friendly-named temp copy before sharing/saving. Clean up temp files after.

## Steps

### Step 1: Add utility functions to storage.js

- **File:** `src/utils/storage.js`
- **Details:**
  - Add `getOrdinalSuffix(n)` — converts age number to ordinal string (1→"1st", 2→"2nd", 11→"11th", 21→"21st", etc.)
  - Add `getFriendlyVideoFilename(childName, age)` — returns `{sanitized name}'s {ordinal} Birthday Interview.mp4`, stripping filesystem-unsafe characters (`<>:"/\|?*`) from the name
  - Add `copyVideoWithFriendlyName(sourceUri, childName, age)` — copies video to `${cacheDirectory}share-temp/` with the friendly filename, returns the new URI
  - Add `cleanupTempShareFiles()` — deletes the `share-temp/` directory (idempotent, silent on error)
  - Place these after the Video Storage section (~line 86)

### Step 2: Update InterviewReviewScreen handlers

- **File:** `src/screens/InterviewReviewScreen.js`
- **Details:**
  - Update import on line 7 to include `copyVideoWithFriendlyName` and `cleanupTempShareFiles`
  - In `handleSaveToLibrary` (line 76): before `saveToLibraryAsync`, create a friendly-named temp copy if child/age data is available, save that copy, then clean up temp files
  - In `handleShare` (line 92): before `shareAsync`, create a friendly-named temp copy if child/age data is available, share that copy, then clean up temp files
  - Fallback: if child or age is missing, use the original URI (backward compatibility)

## Execution Strategy

**Mode:** Solo (sequential execution)

## Verification

1. Run `npm start` and test on device/emulator
2. Record an interview, then tap "Share" — verify the share sheet shows the friendly filename (e.g., `Emma's 3rd Birthday Interview.mp4`)
3. Tap "Save to Camera Roll" — verify the saved file has the friendly name in the gallery
4. Test edge cases: child name with special chars, ages 1/2/3/11/12/13/21/22/23
5. Verify temp files in cache are cleaned up after share/save

## Out of Scope

- Renaming the internal storage filename (stays machine-friendly)
- Renaming existing video files on disk
- Changing the export/import backup filename
