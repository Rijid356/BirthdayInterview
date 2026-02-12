# Plan: Video Transcription, Spotify Integration & Answer Enrichment

**Created:** 2026-02-10
**Status:** Draft
**Complexity:** L
**Execution:** Parallel Agents

## Goal

Add post-recording intelligence to Berfdayy: auto-transcribe video interviews using OpenAI Whisper to populate answer text, make transcriptions editable, integrate Spotify search + 30s preview for the "favorite song" question, and auto-enrich answers with relevant emojis and color tags. Currently interviews are video-only with empty `answers: {}` — this turns them into rich, searchable, year-over-year comparable records.

## Complexity Estimate

**Size: L**

**Reasoning:** 14 files (5 new, 9 modified), 2 external API integrations (OpenAI Whisper, Spotify), new data model fields, question timestamp tracking wired from recording through transcription to review, backward-compatible answer format change, and a major InterviewReviewScreen overhaul. No new npm packages needed though — all APIs use built-in `fetch` and existing `expo-file-system`.

## Approach

- Use `FileSystem.uploadAsync` to send MP4 directly to Whisper (it accepts video, no audio extraction needed)
- Track question navigation timestamps during recording to segment transcription by question
- Store enriched answers as `{ text, source, editedAt }` objects with a `getAnswerText()` helper for backward compat with legacy string answers
- Spotify via Client Credentials flow (no user login), search + 30s preview via expo-av Audio
- Keyword-based emoji/color enrichment now, extensible for LLM enrichment later
- API keys stored in separate AsyncStorage key (excluded from export/import)

## Data Model Changes

Interview object gains new fields:
```javascript
{
  // ...existing fields...
  questionTimestamps: [{ questionId: 'q1', startTime: 0 }, ...],  // NEW
  transcription: { status, rawSegments, error, completedAt },       // NEW
  answers: { q1: { text, source: 'auto'|'edited', editedAt }, ... }, // CHANGED format
  spotify: { trackId, trackName, artistName, albumArt, previewUrl, spotifyUri } | null, // NEW
  enrichment: { q2: { emojis: ['🔵'], colorTag: '#4A90D9' }, ... }, // NEW
}
```

Note: `q5` is the favorite song question (not q4). Verified in `src/data/questions.js:12`.

## Steps

### Step 1: Storage & Data Model Foundation
- **Files:** `src/utils/storage.js`
- **Details:**
  - Add `API_KEYS_KEY = '@berfdayy_api_keys'` constant
  - Add `updateInterview(interviewId, updates)` — read-merge-write pattern for partial updates
  - Add `getApiKeys()` / `saveApiKeys(keys)` for API credential storage
  - Add `getAnswerText(answer)` helper — returns string whether answer is legacy string or new `{ text }` object
  - Export new functions

### Step 2: Question Metadata
- **Files:** `src/data/questions.js`
- **Details:**
  - Add `enrichable: true` and `enrichmentType` fields to relevant questions
  - Types: `'color'` (q2), `'food'` (q3), `'animal'` (q4), `'song'` (q5), `'book'` (q6), `'activity'` (q7), `'movie'` (q8)
  - Add `spotifySearch: true` to q5 only
  - Non-breaking: existing consumers import array, new fields are additive

### Step 3: Transcription Utility
- **Files:** `src/utils/transcription.js` (NEW)
- **Details:**
  - `transcribeVideo(videoUri, apiKey)` — Uses `FileSystem.uploadAsync` to POST MP4 to `https://api.openai.com/v1/audio/transcriptions` with `model: 'whisper-1'`, `response_format: 'verbose_json'`, `timestamp_granularities: ["segment"]`
  - `mapSegmentsToQuestions(segments, questionTimestamps)` — Matches Whisper segments (which have `start`/`end` timestamps) to question time windows. Handles duplicate question entries from Prev/Next navigation by using last occurrence per question
  - `runTranscriptionPipeline(interviewId, videoUri, questionTimestamps, apiKey)` — Orchestrator: sets status → processing, transcribes, maps to questions, updates interview, sets status → completed. Error handling sets status → failed
  - File size check (25MB Whisper limit) before upload

### Step 4: Spotify Utility
- **Files:** `src/utils/spotify.js` (NEW)
- **Details:**
  - `getSpotifyToken(clientId, clientSecret)` — Client Credentials flow with module-level token caching
  - `searchTrack(query, token)` — Search API, returns top result `{ trackId, trackName, artistName, albumArt, previewUrl, spotifyUri }`
  - `searchSongForInterview(answerText, apiKeys)` — Higher-level: get token → search → return data or null
  - Graceful degradation when API keys missing or no results found

### Step 5: Enrichment Utility
- **Files:** `src/utils/enrichment.js` (NEW)
- **Details:**
  - `KEYWORD_EMOJI_MAP` — Large keyword → emoji mapping for colors, animals, foods, activities
  - `COLOR_MAP` — Color name → hex value for color tags
  - `enrichAnswer(answerText, enrichmentType)` — Returns `{ emojis: [...], colorTag }` based on keyword matching
  - `enrichInterview(answers, questions)` — Enriches all enrichable questions, returns enrichment object
  - Designed to be swappable with LLM-powered enrichment later

### Step 6: Theme Additions
- **Files:** `src/utils/theme.js`
- **Details:** Add `spotifyGreen: '#1DB954'`, `transcribing: '#6366F1'`, `autoTag: '#94A3B8'`, `editedTag: '#3B82F6'`, `warning: '#F59E0B'`

### Step 7: InterviewScreen — Question Timestamp Tracking
- **Files:** `src/screens/InterviewScreen.js`
- **Details:**
  - Add `questionTimestampsRef` (useRef) and `recordingStartTimeRef` (useRef)
  - In `startRecording()` (~line 157): capture start time, push first question entry `{ questionId: questions[0].id, startTime: 0 }`
  - In `goNext()` (~line 113): calculate elapsed seconds, push timestamp entry
  - In `goPrev()` (~line 118): same timestamp tracking
  - In `saveAndNavigate()` (~line 126): include `questionTimestamps` and `transcription: { status: 'pending' }` in interview object
  - Pass `autoTranscribe: true` in navigation params

### Step 8: New UI Components
- **Files:** `src/components/EditableAnswer.js` (NEW), `src/components/SpotifyCard.js` (NEW), `src/components/EnrichedAnswer.js` (NEW)
- **Details:**
  - **EditableAnswer**: Tappable answer text with source badge ("auto"/"edited"), enrichment emojis, inline TextInput edit mode with Save/Cancel
  - **SpotifyCard**: Album art (120x120), track name, artist, 30s preview play button (expo-av Audio), "Open in Spotify" deep link button. Styled with app theme + spotifyGreen accent
  - **EnrichedAnswer**: Answer text with emoji chips and color tag dot/pill, source badge. Composable — used inside EditableAnswer

### Step 9: InterviewReviewScreen — Major Overhaul
- **Files:** `src/screens/InterviewReviewScreen.js`
- **Details:**
  - **Auto-transcribe on mount**: Check `route.params?.autoTranscribe` and `transcription.status === 'pending'`, load API keys, call `runTranscriptionPipeline` in background
  - **Status banner**: Replace static "Video Interview" banner with dynamic: processing spinner → completed checkmark → failed with retry → "no API key" with Settings link
  - **Answer display**: Use EditableAnswer component for each Q&A card. Tap to edit, save updates interview via `updateInterview`
  - **Spotify card**: After transcription, extract q5 answer, search Spotify, render SpotifyCard below Q&A section
  - **Enrichment**: After answers populated, run `enrichInterview`, display emojis alongside each answer
  - **Re-transcribe button**: For failed or stale transcriptions, offer retry
  - Use `getAnswerText()` throughout for backward compat

### Step 10: SettingsScreen — API Key Management
- **Files:** `src/screens/SettingsScreen.js`
- **Details:**
  - New "API Keys" section with fields: OpenAI API Key, Spotify Client ID, Spotify Client Secret
  - Secure text entry with visibility toggle
  - "Test Connection" buttons for validation
  - "Save Keys" button with success feedback
  - Privacy note: "Keys are stored on your device only"
  - Load existing keys on focus

### Step 11: Secondary Screen Updates
- **Files:** `src/screens/ChildProfileScreen.js`, `src/screens/YearCompareScreen.js`
- **Details:**
  - **ChildProfileScreen**: Update interview card subtitle to show transcription status and actual answer count using `getAnswerText`
  - **YearCompareScreen**: Show transcribed answers instead of "Video only", display enrichment emojis inline, handle processing/failed states

## Execution Strategy

**Mode:** Parallel Agents

| Wave | Steps | Agents | Why |
|------|-------|--------|-----|
| 1 | Steps 1-6 | 1 sequential agent | Foundation utilities — each is small, some depend on earlier ones |
| 2 | Steps 7, 8, 10, 11 | 4 parallel agents | Independent: InterviewScreen, Components, SettingsScreen, Secondary screens |
| 3 | Step 9 | 1 agent | InterviewReviewScreen depends on all components and utilities from waves 1-2 |

## Verification

1. **API key setup**: Enter OpenAI + Spotify keys in Settings, test connection buttons work
2. **Record an interview**: Navigate through questions, verify timestamps are captured (check saved interview object in AsyncStorage)
3. **Auto-transcription**: After recording, verify processing spinner appears, then answers populate in review screen
4. **Edit transcription**: Tap an answer, edit text, save — verify "edited" badge appears and persists on reload
5. **Spotify card**: Verify album art + track name appear for favorite song answer, 30s preview plays
6. **Enrichment**: Verify emojis appear next to answers (e.g., favorite color "blue" shows blue circle emoji)
7. **Year compare**: Verify transcribed answers show in cross-year timeline instead of "Video only"
8. **Backward compat**: Old video-only interviews (no transcription) still display correctly
9. **No API key graceful degradation**: Without API keys, app works normally, shows banner suggesting setup

## Risks & Mitigations

- **25MB Whisper limit**: Front-camera 1080p video ~5min can exceed. Show clear error, suggest shorter interviews. Future: extract audio-only (smaller file)
- **Child speech accuracy ~75-95%**: Editable transcriptions are essential. Show "auto" badge to set expectations
- **Spotify preview deprecation**: Some tracks return null for `preview_url`. Hide play button, always show album art + "Open in Spotify" link
- **No internet**: Graceful degradation — video interviews work offline, transcription queued for later

## Out of Scope

- LLM-powered enrichment (future — the enrichment utility is designed to be swappable)
- Audio-only extraction for smaller file uploads (would need `ffmpeg-kit` + dev build)
- Cloud backup of transcriptions
- Custom question support
- Batch re-transcription of old interviews

## Future Considerations

- Swap keyword enrichment for OpenAI-powered enrichment (analyze all answers, generate fun facts, contextual emojis)
- Add Apple Music integration alongside Spotify
- Word-level timestamps for video-synced answer highlighting
- Export transcriptions in PDF/image format
