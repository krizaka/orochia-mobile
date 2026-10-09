// Values that differ per build and never live in git, read by EAS Build (or a local build) from the environment:
//   EAS_PROJECT_ID        the Expo project (push tokens are issued for it) — `eas init` prints it
//   GOOGLE_SERVICES_JSON  path to google-services.json (Firebase, for push on Android) — an EAS file secret
module.exports = ({ config }) => ({
  ...config,
  android: {
    ...config.android,
    ...(process.env.GOOGLE_SERVICES_JSON ? { googleServicesFile: process.env.GOOGLE_SERVICES_JSON } : {}),
  },
  extra: {
    ...config.extra,
    ...(process.env.EAS_PROJECT_ID ? { eas: { projectId: process.env.EAS_PROJECT_ID } } : {}),
  },
});
