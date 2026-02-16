# Plan: Burn Question Overlays into Saved/Shared Videos

**Created:** 2026-02-12
**Status:** In Progress
**Complexity:** M
**Execution:** Solo

## Goal

When users save or share an interview video, burn the question text overlays into the video file using FFmpeg so the exported video is self-contained with visible questions at the correct timestamps. Recording stays as-is (fast, raw video); processing happens only on save/share.

## Complexity Estimate

**Size: M**

- **M** = 1-4 hours, 3-8 files, some decisions needed

**Reasoning:** Core logic is a single FFmpeg drawtext command built from existing `questionTimestamps` data. Main work is installing FFmpeg, writing the processing utility, wiring it into save/share, and adding a progress UI. No architectural changes needed — the timestamp data already exists.

## Approach

Use `ffmpeg-kit-react-native` (or actively maintained fork `@apescoding/ffmpeg-kit-react-native`) to post-process videos with FFmpeg's `drawtext` filter. Each question gets a timed text overlay matching the existing `questionTimestamps` array stored per interview.

The FFmpeg filter chain will look like:
```
drawtext=text='How old are you today?':enable='between(t,0,15.5)':fontsize=42:fontcolor=white:
  x=(w-text_w)/2:y=h-180:box=1:boxcolor=black@0.5:boxborderw=12,
drawtext=text='What is your favorite color?':enable='between(t,15.5,32.1)':...
```

Audio is copied without re-encoding (`-c:a copy`). Video is re-encoded with H.264 at reasonable quality (`-crf 23 -preset fast`).

## Steps

### Step 1: Install FFmpeg package and rebuild native code
- **Files:** `package.json`, `android/` (rebuilt via prebuild)
- **Details:**
  - Install `ffmpeg-kit-react-native` or the actively maintained fork (`@apescoding/ffmpeg-kit-react-native`)
  - Need the `full-gpl` variant for `drawtext` filter support (includes freetype/fontconfig)
  - Run `npx expo prebuild --platform android` to regenerate native code
  - Verify the build succeeds with the new native dependency

### Step 2: Create video processing utility
- **Files:** `src/utils/videoProcessing.js` (new)
- **Details:**
  - `burnInQuestions(videoUri, questionTimestamps, questions)` → returns processed video URI
  - Build FFmpeg drawtext filter chain from `questionTimestamps` array:
    - For each timestamp entry, calculate the start/end time (end = next entry's timestamp, or video duration for last)
    - Escape special characters in question text (single quotes, colons, backslashes)
    - Position text at bottom-center with semi-transparent black background box
    - Font size ~42px, white text, matching the recording UI style
  - Output to a temp file in `FileSystem.cacheDirectory`
  - Return the processed video URI
  - Also expose a progress callback using FFmpegKit's statistics callback (time-based progress)

### Step 3: Update InterviewReviewScreen save handler with choice
- **Files:** `src/screens/InterviewReviewScreen.js`
- **Details:**
  - When user taps "Save to Camera Roll", show an Alert with two options:
    - **"With Questions"** — process video with `burnInQuestions()` then save to camera roll
    - **"Without Questions"** — save raw video directly (current behavior)
  - Only show the choice if interview has `questionTimestamps`; otherwise save raw directly
  - Pass `interview.questionTimestamps` and the questions data to the processor
  - Save the PROCESSED video to camera roll, then clean up the temp file
  - If processing fails, fall back to saving the raw video with an alert

### Step 4: Update InterviewReviewScreen share handler with choice
- **Files:** `src/screens/InterviewReviewScreen.js`
- **Details:**
  - Same choice pattern as save: "With Questions" / "Without Questions"
  - "With Questions" — process then share the processed file, clean up temp
  - "Without Questions" — share raw video directly (current behavior)
  - Fall back to raw video on processing failure

### Step 5: Add processing progress UI
- **Files:** `src/screens/InterviewReviewScreen.js`
- **Details:**
  - Add a modal/overlay that shows during video processing: "Processing video..." with a progress bar
  - Use FFmpegKit's statistics callback to calculate progress (current time / total duration)
  - Disable save/share buttons while processing
  - Same pattern for BalloonRunViewScreen if it has question overlays (it doesn't currently — skip)

### Step 6: Handle edge cases
- **Files:** `src/utils/videoProcessing.js`
- **Details:**
  - Long question text: FFmpeg drawtext doesn't auto-wrap. Either truncate or use a smaller font for long questions.
  - Special characters: Escape `'`, `:`, `\`, `[`, `]` in question text for FFmpeg filter syntax
  - Missing timestamps: If interview has no `questionTimestamps`, skip processing and save raw video
  - Old interviews: Some interviews may not have timestamps — handle gracefully
  - Temp file cleanup: Always clean up processed video temp files after save/share completes

## Execution Strategy

**Mode:** Solo (sequential execution)

Steps are sequential — each depends on the previous. Package install must happen first, utility before integration, integration before UI.

## Open Questions

- **FFmpeg package compatibility**: Need to verify which fork works with RN 0.81 / Expo SDK 54. Will test `@apescoding/ffmpeg-kit-react-native` first, fall back to original `ffmpeg-kit-react-native@6.0.2` or `@spreen/ffmpeg-kit-react-native`.
- **Processing time**: A 5-minute interview video may take 10-30 seconds to process on device. User will see a progress bar and can always choose "Without Questions" for instant save.
- **Font availability**: Android may not have a consistent default font for drawtext. May need to bundle a font or use the system default.

## Out of Scope

- Burning overlays into the raw recording (user chose save/share only)
- Custom overlay styling (font, color, position) — use sensible defaults matching the recording UI
- BalloonRunViewScreen changes (no question overlays in balloon runs)
- Cloud-based video processing

## Future Considerations

- Could add a toggle: "Include questions in saved video" (on by default)
- Could add child name/age/date as a title card at the start of the video
- Could add category headers between question groups
- Processing could be backgrounded or pre-cached after recording
