# Lessons Learned

## 2026-02-12
- **Always verify new UI in Playwright before calling a feature done.** When adding screens or UI elements, run a Playwright test (even ad-hoc) to visually confirm the flow works and is discoverable. Don't rely solely on `expo export` build success — a passing build says nothing about UX. Target Pixel 9 viewport dimensions when possible.

### Android Build Setup (Expo → APK)
- **Expo SDK 54 targets compileSdk 36** — don't assume 34. Gradle auto-installs missing SDK components (NDK, CMake, build-tools, platforms) but it's faster to pre-install them.
- **When JAVA_HOME points to a non-Android JDK**, add `org.gradle.java.home=C:\\Users\\Ryan\\AppData\\Local\\Programs\\Android Studio\\jbr` to `android/gradle.properties` instead of changing the system JAVA_HOME.
- **Default Gradle memory is too low for React Native builds.** Use `-Xmx4096m -XX:MaxMetaspaceSize=1024m` in `gradle.properties` to avoid OOM failures.
- **Must create `android/local.properties`** with `sdk.dir=C:\\Users\\Ryan\\AppData\\Local\\Android\\Sdk` if ANDROID_HOME isn't visible to the build shell.
- **Wireless ADB is a reliable fallback** when USB debugging doesn't detect the device. Two-step process: `adb pair <ip>:<pair-port> <code>`, then `adb connect <ip>:<connect-port>` (different ports).
- **Build command sequence**: `npx expo prebuild --platform android` → `cd android && ./gradlew assembleRelease` → APK at `android/app/build/outputs/apk/release/app-release.apk`.
