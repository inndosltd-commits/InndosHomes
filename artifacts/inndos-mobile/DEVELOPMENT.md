# INNDOS Mobile — Native Builds

A standard Expo Go build silently falls back to Apple Maps on iOS because the
Google Maps iOS SDK is not bundled in the Expo Go shell. The camera upload flow
also has limitations in Expo Go. Use a native development or release build to
test Google Maps and full camera access.

---

## Google Maps build key

The native Google Maps key is embedded during prebuild. Store it under both the
development project secrets and **Publishing → Adjust settings → Deployment
secrets** as:

- `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` for Replit Expo Launch
- `GOOGLE_API_KEY` as a compatibility fallback for existing build environments

Expo Launch runs in the publishing environment. A development/project secret
with the same name does not by itself make the value available to native
prebuild.

The static `app.json` loads a local config plugin during native prebuild. That
plugin reads the key from the build environment and injects it into the native
Android and iOS Maps settings without storing the value in source or exposing
it through Expo's public config.

---

## Start the development server

Once the dev build app is installed, start the Metro bundler:

```bash
pnpm --filter @workspace/inndos-mobile run dev
```

Scan the QR code from inside the **INNDOS Mobile** development client, not
Expo Go.

## Publish to the App Store

Use Replit's Publish flow. Expo Launch builds the iOS application, manages the
native signing flow, and submits it to App Store Connect. A native release build
stops during prebuild if neither supported Maps key variable is available; this
prevents publishing a binary whose Google Maps screens cannot work.

---

## Verifying Google Maps works

- Open the **Explore** tab → switch to **Map** view — clustered property pins
  should render on a Google Maps tile (not Apple Maps).
- Open any property → scroll to the **Location** section — the inline map tile
  should show Google Maps styling with a blue-dot marker.

If the map does not load, confirm:
1. `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` exists in Publishing Deployment Secrets.
2. You are running inside a native build, not Expo Go.
3. The Google Maps API key has **Maps SDK for iOS** enabled in the
   Google Cloud Console and the bundle identifier `com.inndos.app` is not
   restricted (or is allowed).

---

## Bundle identifiers

| Platform | Identifier         |
|----------|--------------------|
| iOS      | `com.inndos.app`   |
| Android  | `com.inndos.app`   |

These are set in `app.json` and do not need to be duplicated in `eas.json`.
