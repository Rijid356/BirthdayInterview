# Plan: Rename Berfdayy to git-bigger

**Created:** 2026-02-12
**Status:** In Progress
**Complexity:** S
**Execution:** Solo

## Goal

Rename the entire project from "Berfdayy" to "git-bigger" — app display name, GitHub repo, local directory, Android package name, and all internal references.

## Complexity Estimate

**Size: S**

**Reasoning:** Mostly find-and-replace across ~10 known files, plus a GitHub repo rename and local directory rename. No architectural changes, no new code.

## Approach

Systematic rename in this order: source code files first, then config files, then GitHub repo, then local directory. We'll also update CLAUDE.md project docs and memory files to reflect the new name.

## Steps

### Step 1: Rename in source code files
- **Files:**
  - `src/screens/InterviewScreen.js` — line 271: `{childName}'s Berfdayy Interview` → `{childName}'s git-bigger Interview`
  - `src/screens/SettingsScreen.js` — line 66: `berfdayy-backup.json` → `git-bigger-backup.json`, line 305: app name display `Berfdayy` → `git-bigger`
  - `src/utils/storage.js` — line 6: `@berfdayy_balloon_runs` → `@git-bigger_balloon_runs`
- **Details:** Direct string replacements for user-visible names and storage keys

### Step 2: Rename in config files
- **Files:**
  - `app.json` — name, slug, android package, all permission strings referencing "Berfdayy"
  - `package.json` — name field
  - `package-lock.json` — name fields (2 occurrences)
  - `App.js` — line 36: header title `🎂 Berfdayy` → `🎂 git-bigger`
- **Details:** Update app identity. Android package becomes `com.ryandonnelly.gitbigger`. Slug becomes `git-bigger`.

### Step 3: Update project documentation
- **Files:**
  - `CLAUDE.md` — project overview references
  - `README.md` — title
  - `PROJECT_STATS.md` — project name field
- **Details:** Update all doc references to the new name

### Step 4: Rename GitHub repo
- **Details:** Use `gh repo rename git-bigger` to rename `Rijid356/Berfdayy` → `Rijid356/git-bigger`
- Update git remote URL: `git remote set-url origin git@github.com:Rijid356/git-bigger.git`

### Step 5: Rename local directory
- **Details:** Rename `C:\AppDev\Apps\Berfdayy` → `C:\AppDev\Apps\git-bigger`
- Update Claude memory files that reference the old path

### Step 6: Regenerate package-lock.json
- **Details:** Run `npm install` to update package-lock.json with the new name cleanly

### Step 7: Build and install updated APK
- **Details:** Build a new APK with the updated package name and install it on the connected phone via `adb install`

## Execution Strategy

**Mode:** Solo (sequential execution)

Steps are sequential — code changes must happen before the repo/directory rename, and the build must happen after everything is updated.

## Open Questions

- Should the AsyncStorage keys change? Changing `@berfdayy_balloon_runs` → `@git-bigger_balloon_runs` would lose existing data on devices. We could add a migration or keep the old keys.
- The existing `@birthday_interview_children` and `@birthday_interview_sessions` keys don't use "berfdayy" — should those stay as-is?

## Out of Scope

- Changing the app's color scheme or design
- Modifying any app functionality
- Updating plan files in `.claude/plans/` (those are historical records)
