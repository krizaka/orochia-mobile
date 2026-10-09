import React, { useEffect, useState } from "react";
import { View } from "react-native";
import { t } from "@/i18n";
import { Txt } from "./ui";

/** Time left until `target` (aligned on the server's clock when `serverNow` is given), ticking every second; zero once passed. */
export function Countdown({ target, serverNow, label, size = "sm" }: { target: string; serverNow?: string; label: string; size?: "sm" | "lg" }) {
  // The server's clock minus the device's, measured once: a device set a few minutes off still counts down right.
  const [skewMs] = useState(() => (serverNow ? new Date(serverNow).getTime() - Date.now() : 0));
  const [now, setNow] = useState(() => Date.now() + skewMs);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now() + skewMs), 1000);
    return () => clearInterval(timer);
  }, [skewMs]);
  const left = Math.max(0, new Date(target).getTime() - now);
  const d = Math.floor(left / 86_400_000);
  const h = Math.floor((left % 86_400_000) / 3_600_000);
  const m = Math.floor((left % 3_600_000) / 60_000);
  const s = Math.floor((left % 60_000) / 1000);
  const parts = d > 0 ? [`${d}${t("units.d")}`, `${h}${t("units.h")}`, `${m}${t("units.m")}`] : [`${h}${t("units.h")}`, `${m}${t("units.m")}`, `${s}${t("units.s")}`];
  return (
    <View accessible accessibilityLabel={`${label} ${parts.join(" ")}`}>
      <Txt variant="caption" tone="textTertiary">
        {label}
      </Txt>
      <Txt variant="mono" tone={left < 120_000 ? "danger" : "text"} style={size === "lg" ? { fontSize: 22 } : undefined}>
        {parts.join(" ")}
      </Txt>
    </View>
  );
}
