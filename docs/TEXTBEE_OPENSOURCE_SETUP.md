# Set up Textbee open-source (do this first)

Use this guide to get the **Textbee open-source** Android app built and running on your device. After this, you can do [FCM setup](SMS_FCM_PUSH_DESIGN.md#4-firebase-setup-one-time) and connect it to your Laravel app (webhook + FCM).

**Repo:** [github.com/vernu/textbee](https://github.com/vernu/textbee)

---

## Prerequisites

- **Android Studio** (or at least JDK 11+ and Android SDK for command-line build)
- **Git**
- **Android device** or emulator with a SIM (for real SMS, use a real device)
- **Firebase project** (you’ll add the Android app and get `google-services.json` in the next section)

---

## Step 1: Clone the repo

```bash
git clone https://github.com/vernu/textbee.git
cd textbee
```

The Android app lives in the **`android/`** folder.

---

## Step 2: Firebase (for the Android app)

You need a Firebase project and the **Android app** registered so the app can use FCM.

1. Go to [Firebase Console](https://console.firebase.google.com/) and create a project (e.g. “TextToEat SMS”) or use an existing one.
2. **Add an Android app:**
   - Click **Add app** → **Android**.
   - **Package name:** use one of these (from `android/app/build.gradle` product flavors):
     - **Prod build:** `com.vernu.sms`
     - **Dev build:** `com.vernu.sms.dev`
     Use the one that matches the build you’ll install (e.g. `com.vernu.sms` for release).
   - **App nickname:** optional (e.g. “Textbee”).
   - **Debug SHA-1:** optional; add later if FCM fails on debug builds.
3. Click **Register app**, then **Download `google-services.json`**.
4. Put the file in the Android app module:
   - Place `google-services.json` in **`textbee/android/app/`** (same folder as the app’s `build.gradle`).

*(The **service account JSON** for Laravel is separate — you’ll create that when you do the [FCM setup for Laravel](SMS_FCM_PUSH_DESIGN.md#4-firebase-setup-one-time).)*

---

## Step 3: Point the app at your Laravel backend

For **Text-to-Eat**, the app must call your Laravel API, not textbee.dev.

- In **`android/app/build.gradle`**, find the **prod** flavor and set `API_BASE_URL` to your Laravel base URL (scheme + host only, no path):
  - Example: `buildConfigField "String", "API_BASE_URL", '"https://avelinalacasandile-eat.top"'`
- Use **prod** flavor so the package name stays `com.vernu.sms` (same as in Firebase).
- The Android code changes (GatewayApiService, FCMService, SMSReceivedWorker, etc.) use this base URL for `/api/sms/incoming`, `/api/sms/device/register`, and `/api/sms/outbound/mark-sent`. You do **not** need to replace every `textbee.dev` in the whole repo.

---

## Step 4: Build the Android app

**Before you build:**  
- [ ] `google-services.json` is in **`android/app/`** (next to the app’s `build.gradle`).  
- [ ] In **`android/app/build.gradle`**, the **prod** flavor’s `API_BASE_URL` is set to your Laravel base URL (e.g. `https://yourdomain.com`).

The project has **product flavors** `dev` and `prod`. Use **prod** so the package matches Firebase (`com.vernu.sms`).

### Option A: Android Studio (recommended if you use the IDE)

1. Open **Android Studio**.
2. **File → Open** and select the **`android`** folder inside your Textbee clone (not the repo root). Click OK.
3. Wait for **Gradle sync** to finish (bottom status bar). If prompted, accept the SDK or Gradle version.
4. Select the **build variant:**
   - **Build → Select Build Variant** (or the "Build Variants" tool window).
   - Choose **prodDebug** (for testing) or **prodRelease** (for distribution).
5. **Build the APK:**
   - **Build → Build Bundle(s) / APK(s) → Build APK(s)**.
   - When done, a notification appears: "APK(s) generated successfully." Click **locate** to open the output folder.
6. **Run on device (installs automatically):**
   - Connect your Android phone via USB and enable **USB debugging**.
   - Click the green **Run** (play) button, or **Run → Run 'app'**. Pick your device. The app builds, installs, and launches.

**APK output path:** `android/app/build/outputs/apk/prod/debug/app-prod-debug.apk` (for prodDebug).

### Option B: Command line

```bash
cd textbee/android
# Debug (prod flavor)
./gradlew assembleProdDebug

# Release
./gradlew assembleProdRelease
```

Then install manually (Step 5).

---

## Step 5: Install on your device (if not already)

- **If you used Run in Android Studio:** The app is already installed on the connected device. Skip to Step 6.
- **If you built from the command line or have an APK:**  
  `adb install -r android/app/build/outputs/apk/prod/debug/app-prod-debug.apk`  
  (Run from the repo root; use the path that matches your variant.)

---

## Step 6: On the phone

1. Open the Textbee app.
2. Grant **SMS** (and any other requested) permissions.
3. With internet on, the app should **register its FCM token** with your Laravel backend (`POST /api/sms/device/register`). Ensure Laravel is reachable. The API key is shown as a QR on Portal → SMS devices (app-generated unless you set `SMS_DEVICE_API_KEY` in `.env`); the app sends it as X-API-Key or Bearer.
4. **Inbound:** When an SMS is received, the app POSTs to `/api/sms/incoming`. **Outbound:** When Laravel sends an FCM data message (`id`, `to`, `body`), the app sends the SMS and POSTs to `/api/sms/outbound/mark-sent`. No extra in-app configuration if the base URL and API key (if any) are correct.

---

## What’s next

- **Firebase (Laravel):** [Firebase setup in SMS_FCM_PUSH_DESIGN.md](SMS_FCM_PUSH_DESIGN.md#4-firebase-setup-one-time) — create **service account** key and set `FIREBASE_CREDENTIALS` in Laravel `.env`.
- **Laravel:** Set webhook URL in the gateway app to `https://yourdomain.com/api/sms/incoming`. The app generates an API key automatically (see Portal → SMS devices for the QR); optionally set `SMS_DEVICE_API_KEY` in `.env` to use your own key.
- **End-to-end:** Inbound SMS → webhook → Laravel; outbound → Laravel enqueues → FCM → Textbee app sends SMS → mark-sent.
