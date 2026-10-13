import { afterEach, describe, expect, it } from "@jest/globals";

// app.json + app.config.js are what EAS Build and `expo prebuild` read: the Expo project and Firebase must resolve.
const appJson = require("../../app.json") as { expo: Record<string, any> };
// eslint-disable-next-line @typescript-eslint/no-require-imports
const appConfig = require("../../app.config.js") as (ctx: { config: Record<string, any> }) => Record<string, any>;

describe("app config (EAS project, push)", () => {
  const saved = process.env.PUSH_ANDROID_CONFIG_FILE;
  afterEach(() => {
    if (saved === undefined) delete process.env.PUSH_ANDROID_CONFIG_FILE;
    else process.env.PUSH_ANDROID_CONFIG_FILE = saved;
  });

  it("names the EAS project push tokens are issued for, in git", () => {
    const config = appConfig({ config: appJson.expo });
    expect(config.owner).toBe("oussamaabid");
    expect(config.extra.eas.projectId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    expect(config.ios.bundleIdentifier).toBe("com.krizaka.orochia");
    expect(config.android.package).toBe("com.krizaka.orochia");
  });

  it("takes google-services.json from the build environment only, never from the repository", () => {
    delete process.env.PUSH_ANDROID_CONFIG_FILE;
    expect(appConfig({ config: appJson.expo }).android.googleServicesFile).toBeUndefined();
    process.env.PUSH_ANDROID_CONFIG_FILE = "/eas/google-services.json";
    const config = appConfig({ config: appJson.expo });
    expect(config.android.googleServicesFile).toBe("/eas/google-services.json");
    expect(config.android.package).toBe("com.krizaka.orochia");
  });
});
