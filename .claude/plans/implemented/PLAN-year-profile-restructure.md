# Plan: Year-Based Profile Restructure

**Status:** Completed
**Complexity:** M (Medium)
**Strategy:** Solo

## Context
The ChildProfileScreen currently shows flat category-based sections (Interview History, Balloon Runs, Birthday Media). The user wants a year-based organization instead: the profile shows a list of past years, and tapping a year opens a detail screen with all content (interview, balloon run, media) for that year.

## Steps

### 1. Add year-aggregation function — `src/utils/storage.js`

Add `getYearSummariesForChild(childId)` that:
- Calls `getInterviewsForChild`, `getBalloonRunsForChild`, `getBirthdayMediaForChild` in parallel
- Collects all unique years from the union of all three sources
- Returns array sorted newest-first:
```js
{ year: 2025, age: 5, hasInterview: true, hasBalloonRun: false, mediaCount: 12 }
```
- Handle `age` gracefully — use whichever source provides it; may be `null` if only media exists without an age

### 2. Rewrite ChildProfileScreen — `src/screens/ChildProfileScreen.js`

**Keep unchanged:**
- Profile header (avatar, name, age, birthday, photo picker)
- Action buttons row ("Start Interview", "Balloon Run") for quick current-year access

**Replace** the three category sections (Interview History, Balloon Runs, Birthday Media) with:
- "Years" section header
- FlatList of year cards, each showing:
  - Left: year number (large, bold) + age badge
  - Center: icon badges for what exists (🎥 Interview, 🎈 Balloon Run, 📸 N media)
  - Right: chevron ›
  - Tap → navigates to `YearDetail` screen
- "Compare Years" button — keep, show when 2+ years have interviews

**Remove:** `interviews`, `balloonRuns`, `birthdayMedia` state + their loaders, `renderInterviewCard`, all category section styles, balloon run cards, media strip.

**Add:** `yearSummaries` state, `renderYearCard`, load via `getYearSummariesForChild`.

**Empty state:** "No memories yet!" with prompt to start first interview.

### 3. Create YearDetailScreen — `src/screens/YearDetailScreen.js` (new file)

**Route params:** `{ childId, childName, year, age }`

**Data loading:** On focus, load all three sources for child, filter by `year` client-side.

**Layout (ScrollView):**

1. **Year header** — large year, "Age X" subtitle (hide age if null)
2. **Interview section** — cards or empty state with action button (current year only)
3. **Balloon Run section** — cards or empty state with action button (current year only)
4. **Birthday Media section** — 3-column grid, add button always visible, long-press delete

### 4. Register route — `App.js`

- Import `YearDetailScreen`
- Add `<Stack.Screen name="YearDetail" component={YearDetailScreen} options={({ route }) => ({ title: String(route.params.year) })} />`

## Files to Modify

| File | Change |
|------|--------|
| `src/utils/storage.js` | Add `getYearSummariesForChild()` |
| `src/screens/ChildProfileScreen.js` | Rewrite: year cards instead of category sections |
| `src/screens/YearDetailScreen.js` | **New file** — per-year detail with all content types |
| `App.js` | Add YearDetail route |
