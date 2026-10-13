// The Expo project (owner + extra.eas.projectId, which push tokens are issued for) is in app.json — public, not a secret.
// One value differs per build and never lives in git, read by EAS Build (or a local build) from the environment:
//   PUSH_ANDROID_CONFIG_FILE  path to google-services.json (Firebase, for push on Android) — an EAS file environment variable
module.exports = ({ config }) => ({
  ...config,
  android: {
    ...config.android,
    ...(process.env.PUSH_ANDROID_CONFIG_FILE ? { googleServicesFile: process.env.PUSH_ANDROID_CONFIG_FILE } : {}),
  },
});
