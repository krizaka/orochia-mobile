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
- **Shared UI comes from npm, never a copy**: tokens from `@krizaka/orochia-design-system/tokens`, the mark from
  `@krizaka/ui/native`. A missing token or mark is added to its package first.
- **Every user-facing string is in `src/i18n/en.json`** and read with `t("key")` (typed keys). No literal text in JSX.
- **Both themes**: colours come from `useTheme()` only; a screen is checked in dark and light.
- **The 18+ gate** runs before anything else on a fresh install.

## Expo changes with every SDK

Before touching an Expo, EAS or React Native API, read the docs for this project's SDK (`expo` in `package.json`):
`https://docs.expo.dev/versions/v<major>.0.0/` and https://docs.expo.dev/llms.txt. Install native packages with
`npx expo install`; `ios/` and `android/` are generated (Continuous Native Generation) — configure them in `app.json`.

## Definition of done

`npm run check` is green (lint, type-check, tests, iOS and Android bundles), and the change is checked on a device or
simulator in both themes.
