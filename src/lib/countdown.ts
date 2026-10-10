import { useState } from "react";
import { t } from "@/i18n";

/** The countdown's unit letters, translated. */
export const countdownUnits = () => ({ d: t("units.d"), h: t("units.h"), m: t("units.m"), s: t("units.s") });

/** The server's clock minus the device's (0 without a server time): a device set a few minutes off still counts right. */
export function clockSkew(serverNow: string | undefined, deviceNow = Date.now()): number {
  if (!serverNow) return 0;
  const server = new Date(serverNow).getTime();
  return Number.isFinite(server) ? server - deviceNow : 0;
}

/** The skew, measured once the first server time arrives (it comes with the data), then kept. */
export function useClockSkew(serverNow: string | undefined): number {
  const [skew, setSkew] = useState<number | null>(null);
  if (skew === null && serverNow) setSkew(clockSkew(serverNow));
  return skew ?? 0;
}
