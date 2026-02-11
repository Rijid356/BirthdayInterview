# 🎂 Berfdayy

A React Native (Expo) app for recording annual birthday interviews with your kids. Each year, ask them the same set of fun questions, record a video, and log their answers. Watch how they grow and change over the years!

## Features
- **Multi-child support** — profiles for each of your kids
- **20 curated interview questions** across 6 fun categories
- **Continuous video recording** with on-screen question prompts
- **Text answer logging** alongside the video
- **Year-over-year comparison** to see how answers change
- **Local-first storage** with JSON backup/export

## Getting Started

```bash
# Install dependencies
npm install

# Start the dev server
npx expo start

# Run on Android
npx expo start --android
```

## Project Structure

```
├── App.js                    # Navigation setup
├── CLAUDE.md                 # Full spec for Claude CLI development
├── src/
│   ├── data/
│   │   └── questions.js      # 20 default interview questions
│   ├── screens/
│   │   └── HomeScreen.js     # Starter screen (build out the rest)
│   └── utils/
│       ├── storage.js        # AsyncStorage + file system helpers
│       └── theme.js          # Colors and sizing constants
```

## Building with Claude CLI

This project is set up as a starting point. Open the project directory and run:

```bash
claude
```

Then ask Claude to build out the remaining screens. The CLAUDE.md file contains the full spec including data models, screen descriptions, and implementation notes.

**Suggested first prompt:**
> Build out all the remaining screens described in CLAUDE.md. Start with AddChildScreen and ChildProfileScreen, then the InterviewScreen with camera recording, InterviewReviewScreen, YearCompareScreen, and SettingsScreen. Wire them all into App.js navigation.

## Building an APK

```bash
# Install EAS CLI
npm install -g eas-cli

# Configure
eas build:configure

# Build APK for Android
eas build -p android --profile preview
```
