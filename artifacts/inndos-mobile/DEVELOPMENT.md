# INNDOS Mobile — EAS Development Build

A standard Expo Go build silently falls back to Apple Maps on iOS because the
Google Maps iOS SDK is not bundled in the Expo Go shell. The camera upload flow
also has limitations in Expo Go. Use an **EAS development build** to get a real
installable app that embeds the Google Maps SDK and full camera access.

---

## Prerequisites

```bash
npm install -g eas-cli          # install EAS CLI globally
eas login                        # log in with your Expo account
```

---

## 1 — Register the GOOGLE_API_KEY EAS secret

The Google Maps API key must be embedded at build time. Run this once per
project (you need `Owner` or `Admin` role on the Expo project):

```bash
cd artifacts/inndos-mobile
eas secret:create --scope project --name GOOGLE_API_KEY --value <your-google-api-key>
```

The static `app.json` loads a local config plugin during native prebuild. That
plugin reads `GOOGLE_API_KEY` from the build environment and injects it into
the native Android and iOS Maps settings without storing the key in source.
EAS automatically makes the secret available as an env var during the build.

> **Already have a key?** The `GOOGLE_API_KEY` secret is available in the
> Replit workspace environment. Use the same value for EAS.

---

## 2 — Build for iOS Simulator (fastest for development)

```bash
cd artifacts/inndos-mobile
eas build --platform ios --profile development
```

EAS builds a `.app` bundle you can drag-and-drop into the iOS Simulator.
The `development` profile already sets `ios.simulator: true` in `eas.json`.

### Install into the simulator

1. Download the `.tar.gz` build artifact from [expo.dev](https://expo.dev).
2. Extract it to get the `.app` folder.
3. Open **Xcode → Simulator**, then drag the `.app` onto the running simulator.
4. Launch **INNDOS Mobile** and scan the QR code from `pnpm --filter @workspace/inndos-mobile run dev`.

---

## 3 — Build for a physical iOS device

Remove `ios.simulator: true` for a real-device build (requires Apple Developer
Program membership and a provisioning profile):

```bash
eas build --platform ios --profile development --local   # optional: build locally
# or
eas build --platform ios --profile development           # build on EAS servers
```

Install via **TestFlight** or directly with Xcode after downloading the IPA.

---

## 4 — Build for Android

```bash
eas build --platform android --profile development
```

Download the `.apk` and install it on any Android device or emulator:

```bash
adb install path/to/build.apk
```

---

## 5 — Start the dev server

Once the dev build app is installed, start the Metro bundler:

```bash
pnpm --filter @workspace/inndos-mobile run dev
```

Scan the QR code from inside the **INNDOS Mobile** dev client (not Expo Go).

---

## Verifying Google Maps works

- Open the **Explore** tab → switch to **Map** view — clustered property pins
  should render on a Google Maps tile (not Apple Maps).
- Open any property → scroll to the **Location** section — the inline map tile
  should show Google Maps styling with a blue-dot marker.

If the map still shows Apple Maps, confirm:
1. The EAS secret is set: `eas secret:list`
2. You are running inside the dev build app, not Expo Go.
3. The Google Maps iOS SDK API key has **Maps SDK for iOS** enabled in the
   Google Cloud Console and the bundle identifier `com.inndos.app` is not
   restricted (or is allowed).

---

## Bundle identifiers

| Platform | Identifier         |
|----------|--------------------|
| iOS      | `com.inndos.app`   |
| Android  | `com.inndos.app`   |

These are set in `app.json` and do not need to be duplicated in `eas.json`.
