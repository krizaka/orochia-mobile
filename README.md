<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/krizaka/.github/main/profile/assets/orochia-dark.svg">
    <img src="https://raw.githubusercontent.com/krizaka/.github/main/profile/assets/orochia-light.svg" alt="Orochia" width="96">
  </picture>
</p>

<h1 align="center">Orochia for iOS and Android</h1>

<p align="center">
  The creator video platform, in your pocket — stories, the feed, protected 4K playback, challenges and auctions,<br>
  on the same API and the same rules as <a href="https://github.com/krizaka/orochia">orochia.com</a>.
</p>

<p align="center">
  <a href="https://github.com/krizaka/orochia-mobile/actions/workflows/ci.yml"><img src="https://github.com/krizaka/orochia-mobile/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="https://scorecard.dev/viewer/?uri=github.com/krizaka/orochia-mobile"><img src="https://api.scorecard.dev/projects/github.com/krizaka/orochia-mobile/badge" alt="OpenSSF Scorecard"></a>
  <img src="https://img.shields.io/badge/Expo-SDK%2057-000?logo=expo" alt="Expo SDK 57">
  <img src="https://img.shields.io/badge/React%20Native-0.86-61dafb?logo=react" alt="React Native 0.86">
  <img src="https://img.shields.io/badge/license-Apache--2.0-blue" alt="Apache-2.0">
  <a href="https://dev.orochia.com/docs"><img src="https://img.shields.io/badge/docs-dev.orochia.com%2Fdocs-7c3aed" alt="Documentation"></a>
</p>

<p align="center">
  <br><sub>Alex opens Elena's story, likes it, replies privately and tips her — recorded on the web; the app does the same on the same API. <a href="https://dev.orochia.com">Full tour</a> · <a href="https://www.krizaka.com/docs/orochia">Documentation</a></sub>
</p>

---

## What it does

| | |
| :--- | :--- |
| **Stories & feed** | The creators you may see, unseen rings first; the feed with what each video is for (free, followers, contacts, unlock, invited, auction, backers) |
| **Protected playback** | HLS from Bunny Stream, signed by the server for you for five minutes — the app never holds a raw media URL. Picture-in-picture, full screen |
| **Challenges** | Goals, dares and open calls: the pot as a ring that fills as pledges land, the clock, the leaderboard, back it in one tap — credits held until delivery |
| **Auctions** | The price, the clock aligned on the server's, bids by alias, bid in credits |
| **You** | Create an account in the app (username checked live, 18+ birth date, terms, e-mail verification) or sign in — the session lives in the Keychain / Keystore —, wallet and what is held, notifications |
| **Notifications** | In real time while the app is open (a toast, the badge on *You*), push when it is not — a new follower, a tip, an unlock, a bid, a pledge, a message; tapping one opens it |

Paying (top-ups, unlocks) happens on orochia.com, in the payment provider's own checkout: card details never reach
Orochia, and an adult-content platform cannot sell through the stores' in-app purchases.

## Why React Native (Expo), not Flutter

Bunny Stream has no mobile SDK of its own for either framework: what an app needs is **HLS playback** and **Tus
uploads**, both open standards. On React Native, `expo-video` plays HLS natively (AVPlayer on iOS, ExoPlayer/Media3 on
Android) and `tus-js-client` speaks Tus; Flutter has equivalents (`video_player`, `tus_client`) — so Bunny decides
nothing. What decides is everything around it:

- **One language, one set of types and rules** with the web app (TypeScript, the same API shapes, the same message
  conventions) and the Orazaka mobile client, already on Expo.
- **The same components, tokens and brand mark, from npm** — `@krizaka/ui/native` (Txt, Button, Card, Chip, Badge,
  Avatar, Countdown, Progress, toasts and the animated Orochia mark, the web kit's names on React Native) themed by
  `nativeTheme` of `@krizaka/orochia-design-system/tokens`. Never a copy; Flutter would need a second, drifting
  implementation of all of it.
- **Builds without local Xcode or Android Studio** (EAS, or the Android CI build below), over-the-air updates for
  JavaScript changes.

## Run it

```bash
npm install
npx expo start             # press i (iOS simulator), a (Android emulator) — or scan with a development build
npm run check              # lint, type-check, tests, iOS and Android bundles
```

It talks to `https://dev.orochia.com` by default. To use a local Orochia (`npm run dev` in
[krizaka/orochia](https://github.com/krizaka/orochia)):

```bash
EXPO_PUBLIC_APP_URL=http://192.168.1.10:3000 npx expo start   # your machine's address, reachable from the phone
```

`expo-video` and `expo-secure-store` are native modules: use a development build (`npx expo run:ios` /
`npx expo run:android`), not Expo Go.

## Push notifications

Pushes go through the Expo Push Service, which delivers with **Firebase Cloud Messaging** on Android and **APNs** on
iOS; the Orochia server only needs the phone's Expo token (see
[Orochia — Notifications & Realtime](https://github.com/krizaka/orochia/blob/main/docs/NOTIFICATIONS.md)). To turn
them on (done for Android on 2026-10-12 — Expo project `@oussamaabid/orochia`, Firebase `orochia-2026`):

1. The Expo project is in `app.json` (`owner`, `extra.eas.projectId`) — public, push tokens are issued for it.
2. Firebase project → Android app `com.krizaka.orochia` → `google-services.json` as the EAS **file** environment
   variable `PUSH_ANDROID_CONFIG_FILE` (never in git; `app.config.js` reads it); the FCM V1 service-account key is uploaded
   to the project's Android credentials (`eas credentials` → Android → FCM V1).
3. iOS: `eas credentials` → iOS → Push Notifications (APNs key from the Apple Developer account) — once Apple activates
   the account.

Without them the app runs the same, with real-time notifications in the foreground and no push.

## Builds

| Platform | How |
| :--- | :--- |
| **Android** | A `v*` tag builds a preview APK in CI and attaches it to the GitHub release — install it directly on a device. `npx eas-cli@latest build --platform android --profile preview` builds the same APK on EAS, signed with the project's EAS keystore and with push (FCM) |
| **iOS** | `npx eas-cli@latest build --platform ios` with the organisation's Apple Developer account (TestFlight / ad hoc) |

Store listings: Apple and Google do not distribute apps whose purpose is sexually explicit content. Orochia is for
adults (18+ gate at first launch, the same 18+ rules as the web), so distribution is outside the stores — APK on
GitHub, TestFlight / ad hoc on iOS — unless a store-safe edition is decided.

## How it is built

```
src/app/                 Expo Router: (tabs) home · challenges · auctions · you; watch/[id], challenges/[id], auctions/[id]
src/components/          business components only: tiles, stories rail and viewer, amount picker, 18+ gate
                         (every UI component comes from @krizaka/ui/native)
src/lib/                 api (bearer session, typed errors), auth (sign-in, sign-up, e-mail verification, secure storage), signup (the sign-up API client), theme (spacing, signature
                         gradient), auction-presenter (shared with the web), useApi / usePolling, config
                         (EXPO_PUBLIC_APP_URL)
src/i18n/en.json         every user-facing string (typed keys)
```

- **Sessions**: `POST /api/auth/login` with `client: "native"` answers the signed session token, kept in secure storage
  and sent as `Authorization: Bearer` — the same token, verification and account re-read as the web's cookie.
- **Kept current**: React Native has no `EventSource`, so open challenges and auctions refresh every few seconds while
  the app is in the foreground, without a spinner.
- **Themes**: the system's appearance, with the design system's dark and light palettes by role.

---

Apache-2.0 · Part of [Orochia](https://github.com/krizaka/orochia) by [Krizaka](https://www.krizaka.com) — open source,
closed to compromise.

---

<sub>A Krizaka product · [krizaka.com](https://www.krizaka.com) · Apache-2.0</sub>
