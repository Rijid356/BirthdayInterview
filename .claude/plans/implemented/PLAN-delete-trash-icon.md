# Plan: Add Visible Trash Can Delete Buttons

**Created:** 2026-02-15
**Status:** Completed
**Complexity:** S
**Execution:** Solo

## Goal

Make deleting interviews and balloon runs discoverable by adding a visible trash can icon on each card in YearDetailScreen. Currently, deletion is hidden behind a long-press gesture. The confirmation dialog already exists — we just need a visible button to trigger it.

## Complexity Estimate

**Size: S**

- 1 file to modify (`YearDetailScreen.js`)
- Pattern already exists (long-press handlers + Alert confirmations are fully implemented)
- Just adding a visible TouchableOpacity trash icon to each card

**Reasoning:** The delete logic and confirmation dialogs are already wired up. We're just adding a visual affordance (trash icon button) that calls the same handlers.

## Approach

Add a small trash can icon (`🗑`) as a TouchableOpacity on interview and balloon run cards in YearDetailScreen. Place it between the card content and the chevron. Keep the existing long-press as an alternative gesture. Style it subtly (light red background circle) so it's visible but not dominant.

## Steps

### Step 1: Add trash icon buttons to interview and balloon run cards
- **Files:** `src/screens/YearDetailScreen.js`
- **Details:**
  - Add a `TouchableOpacity` with a trash emoji (`🗑`) to each interview card (line ~196) and balloon run card (line ~242)
  - Position it between `cardContent` and the chevron
  - On press, call `handleDeleteInterview(interview)` / `handleDeleteBalloonRun(run)` respectively
  - Style: small circular button with faint red background, matching the existing `modalDeleteBtn` pattern
  - Keep `onLongPress` on the cards as an alternative gesture

## Out of Scope

- Media thumbnails (they already have a trash icon in the full-screen viewer modal)
- BirthdayGalleryScreen (same — modal has trash icon)
- Changing the confirmation dialog wording (already says "Are you sure?")

## Future Considerations

- Could add swipe-to-delete as another gesture option
- Could add edit/rename alongside delete in a card action row
