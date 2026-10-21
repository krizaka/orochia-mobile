# orochia-mobile — Scope (agent-neutral)

> The Orochia app for iOS and Android (Expo / React Native). It is a client of the Orochia web app's API and follows
> the Orochia contract ([`krizaka/orochia/AGENTS.md`](https://github.com/krizaka/orochia/blob/main/AGENTS.md)); this
> file only scopes it.

## Rules

- **No rule lives here that the server does not enforce.** Access, money and moderation are decided by the API; the app
  shows what it answers. Never compute an access decision, a price or a balance on the device.
- **Sessions**: the native session token (`client: "native"` at sign-in) lives only in `expo-secure-store`
  (`src/lib/storage.ts`); it is sent as `Authorization: Bearer`. No token in logs, in plain storage or in a URL.
- **No raw media URL**: play only what `/api/videos/<id>/stream` (or a story) answers, signed for the viewer.
- **Payments stay on the web**, in the provider's checkout (`expo-web-browser`); the app never collects card details.
- **UI components = `@krizaka/ui/native`** (Txt, Button, Card.*, Chip, Badge, Avatar, Countdown, Progress, Segmented,
  EmptyState, Mascot, Skeleton, Toaster/toast, the mark), themed by `<ThemeProvider overrides={nativeTheme}>` with `nativeTheme`
  from `@krizaka/orochia-design-system/tokens` (≥ 4.1.1: it carries the Orochia brand — `accentText` violet). Charts are
  `@krizaka/charts/native` (react-native-svg) under `src/components/Charts.tsx` (Orochia palette, the app's theme and words). `src/components` holds only business components (tiles, stories rail,
  amount picker, 18+ gate). **A missing component is a PR in [krizaka-ui](https://github.com/krizaka/krizaka-ui)**,
  released, then adopted here — never a local copy. Same for a missing token or mark. Haptics stay in the app
  (`src/lib/haptics.ts`, in `onPress`).
- **Every user-facing string is in `src/i18n/en.json` and `fr.json`** and read with `t("key")` (`src/i18n/index.ts`, bound to [`@krizaka/i18n`](https://www.npmjs.com/package/@krizaka/i18n) like the web app: keys typed from `en.json`, `fr.json` typed against it, plurals as `{ one, other }` sets). The app speaks the **phone's language** (French for `fr`, `fr-CA`… — Québec French, « vous », the web app's vocabulary: *pourboire*, *crédits*, *défi*, *contribution*, *courriel*); money and counts are formatted in `fr-CA`/`en-US`, and every API call sends `Accept-Language` so the server's messages, e-mails and push follow. No literal text in JSX: `npm run check:i18n` (part of `npm run lint`) runs `krizaka-i18n check` and `scan`.
- **Both themes**: colours come from `useTheme()` of `@krizaka/ui/native` only (roles: `surface0`, `textPrimary`,
  `accent`…); a screen is checked in dark and light.
- **The 18+ gate** runs before anything else on a fresh install.
- **Notifications and messages**: in the foreground, ONE live stream (`src/lib/live.tsx`, SSE with the bearer session,
  reopened with `?after=<last message seq>` when the app comes back) shows toasts and the badges, and screens listen to
  it with `useLiveEvents` (Messages: conversations, presence, typing, receipts — rules and events in krizaka/orochia
  `docs/NOTIFICATIONS.md` §5; message ordering and merging in `src/lib/chat.ts`, the same as the web's); in the background, push (`src/lib/push.ts`, Expo token registered at sign-in, forgotten at sign-out).
  A tapped push opens its `path` through `openPath` (`src/lib/links.ts`) — while the app runs and when the tap launched
  it (`useOpenTappedPush`, each notification once). An auction or a challenge on screen follows its own public feed
  (`src/lib/live-topic.ts`, `/api/auctions|challenges/:id/stream`): an event updates the screen at once
  (`src/lib/live-updates.ts`, numbers never go back down), then a reload brings what is the viewer's — no polling.
  Preferences by kind (`orochia://settings/notifications`, `src/lib/notification-prefs.ts`) write the account's
  `inAppOff` list, which covers the bell, the toasts and the push. Push needs a development or EAS build, never
  Expo Go; the Expo project (`owner`, `extra.eas.projectId`) is in `app.json`; `google-services.json` comes from the EAS file environment variable `PUSH_ANDROID_CONFIG_FILE` (`app.config.js`).
- **Universal links / App Links** (`app.json` `associatedDomains` + Android `intentFilters` with `autoVerify`): the paths the web app claims in
  `/.well-known/apple-app-site-association` and `assetlinks.json` (krizaka/orochia `app-links.json`) each open a screen of this app
  (`/@handle` is rewritten to `u/[handle]` by `src/app/+native-intent.ts`). `scripts/check-app-links.mjs` (identical in every Krizaka
  repository, from krizaka/.github) fails CI when a claimed path has no screen or `app.json` does not cover it. Add a web route that
  should open the app: claim it there, add the screen and the `app.json` filter here.
- **Environment variables are named by bounded context** (krizaka/.github#46): `EXPO_PUBLIC_<CONTEXT>_<THING>` for what the
  JavaScript reads (`EXPO_PUBLIC_APP_URL`, `EXPO_PUBLIC_APP_ENV`, validated in `src/lib/config.ts`, the app's one env module), `<CONTEXT>_<THING>` for
  build inputs (`PUSH_ANDROID_CONFIG_FILE`) — never a product (`OROCHIA_…`) nor a vendor (`GOOGLE_…`, `EXPO_…`).
  `src/__tests__/env.test.ts` refuses another name.

## Expo changes with every SDK

Before touching an Expo, EAS or React Native API, read the docs for this project's SDK (`expo` in `package.json`):
`https://docs.expo.dev/versions/v<major>.0.0/` and https://docs.expo.dev/llms.txt. Install native packages with
`npx expo install`; `ios/` and `android/` are generated (Continuous Native Generation) — configure them in `app.json`.

## Definition of done

`npm run check` is green (lint, type-check, tests, iOS and Android bundles), and the change is checked on a device or
simulator in both themes.

**No test, not done.** Every feature and every fix ships with its tests (Jest + `jest-expo` + Testing Library): a unit
test for logic, a render test for a screen or a component; a fix starts with a failing test that reproduces the bug.
CI runs them and must be green — a test is never skipped or weakened to get there.

PR captures (screenshots, recordings, metrics) are never committed: they go to Bunny Storage under `pr-assets/<repo>/<pr-or-topic>/` with [`scripts/pr-assets.mjs`](https://github.com/krizaka/krizaka-com/blob/main/scripts/pr-assets.mjs) of krizaka-com (its AGENTS.md §5.1), and the PR body links their CDN URLs. `docs/screenshots/` is git-ignored.
