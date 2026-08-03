# Modifications

This is a modified fork of **Litube** by HydeYYHH (upstream: https://github.com/HydeYYHH/litube),
based on version **v2.1.4** (versionCode 214). Litube is licensed under **GPL-3.0**, and this fork
is distributed under the same license. See `LICENSE`.

The following features were added on top of upstream. Each entry lists the main files touched.

1. **Floating incognito toggle**
   A small, draggable, semi-transparent button on the home view temporarily clears the
   YouTube/Google session cookies (so the site behaves as if signed out) and restores them when
   toggled off. Cookies acquired during the incognito session are discarded on exit.
   - `app/src/main/java/com/hhst/youtubelite/browser/IncognitoManager.java` (new)
   - `app/src/main/java/com/hhst/youtubelite/ui/MainActivity.java`
   - `app/src/main/res/layout/activity_main.xml`, `res/drawable/ic_incognito.xml`, `res/values/strings.xml`

2. **Native launch splash screen**
   Uses the Android 12 SplashScreen API (backported via `androidx.core:core-splashscreen`) to show
   the app icon on the brand background before the WebView home loads.
   - `app/src/main/res/values/themes.xml`, `AndroidManifest.xml`, `MainActivity.java`, `app/build.gradle.kts`

3. **Lock button freezes all gestures**
   While locked, seek/volume/brightness/tap/double-tap/long-press and pinch-zoom are all disabled;
   only a single tap (to reveal/hide the unlock button) responds until unlocked.
   - `app/src/main/java/com/hhst/youtubelite/player/controller/gesture/PlayerGestureListener.java`
   - `app/src/main/java/com/hhst/youtubelite/player/controller/Controller.java`

4. **Swipe-down to minimize (windowed)**
   A downward swipe on the center of a windowed (non-fullscreen) video minimizes it into the in-app
   mini-player, reusing the existing watch-page suspend path.
   - `PlayerGestureListener.java`, `Controller.java`

5. **Drag-to-dismiss mini-player**
   Dragging the mini-player fades in a dismiss (X) target at the bottom of the screen; dropping the
   window onto it closes the mini-player.
   - `app/src/main/java/com/hhst/youtubelite/player/LitePlayerView.java`
   - `MainActivity.java`, `res/layout/activity_main.xml`, `res/drawable/bg_mini_dismiss.xml`

6. **Conservative UI polish**
   An additive, layout-safe stylesheet injected into the web content (rounded thumbnails, smoother
   scrolling), applied through the app's existing style-injection pipeline.
   - `app/src/main/assets/style/modern.css` (new)

7. **Automatic launch update checker**
   Performs a background check for new releases on GitHub every time the app starts, prompting the user
   with a modern Material dialog with direct update/download links when a newer release is detected.
   - `app/src/main/java/com/hhst/youtubelite/util/UpdateChecker.java` (new)
   - `app/src/main/java/com/hhst/youtubelite/ui/MainActivity.java`
   - `app/src/main/res/values/strings.xml`

## Building

```
./gradlew :app:assembleDebug
```

The debug APK is written to `app/build/outputs/apk/debug/`. On a low-memory machine (≲4 GB RAM),
add these to `gradle.properties` to avoid the build being killed:

```
org.gradle.workers.max=1
kotlin.compiler.execution.strategy=in-process
org.gradle.jvmargs=-Xmx1800m -XX:MaxMetaspaceSize=512m -Dfile.encoding=UTF-8
```
