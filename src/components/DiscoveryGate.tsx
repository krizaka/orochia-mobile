import React from "react";
import { AppState, Linking, Platform, View } from "react-native";
import { pickMessage } from "@krizaka/discovery";
import { DiscoveryGate as Gate, DiscoveryProvider, type DiscoveryProviderProps } from "@krizaka/discovery/react";
import { ForceUpdateScreen, MaintenanceScreen, useTheme } from "@krizaka/ui/native";
import { t, locale } from "@/i18n";
import { discovery, UPDATE_URL } from "@/lib/config";
import { OrochiaMark } from "./OrochiaMark";

/** Returns the app to the foreground → one manifest refresh (a stable function: the provider subscribes once). */
export const onForeground: NonNullable<DiscoveryProviderProps["subscribeForeground"]> = (callback) => {
  const subscription = AppState.addEventListener("change", (state) => state === "active" && callback());
  return () => subscription.remove();
};

/** What the signed manifest decided (krizaka/.github ADR-003): a build below `minAppVersion` or a maintenance window replaces the app. */
export function DiscoveryGate({ children }: { children: React.ReactNode }) {
  const open = () => void Linking.openURL(Platform.OS === "ios" ? UPDATE_URL.ios : UPDATE_URL.android);
  const retry = () => void discovery.refresh();
  return (
    <Gate
      product="orochia"
      update={(gate) => (
        <ForceUpdateScreen
          fill
          mark={<OrochiaMark size={64} />}
          title={t("update.forceTitle")}
          message={pickMessage(gate.message, locale())}
          versionLabel={t("update.version", { version: gate.latestAppVersion })}
          updateLabel={t("update.update")}
          onUpdate={open}
          retryLabel={t("common.retry")}
          onRetry={retry}
        />
      )}
      maintenance={(gate) => (
        <MaintenanceScreen fill mark={<OrochiaMark size={64} />} title={t("update.maintenanceTitle")} message={pickMessage(gate.message, locale())} retryLabel={t("common.retry")} onRetry={retry} />
      )}
    >
      {children}
    </Gate>
  );
}

/** Starts discovery (the cache answers at once; a first launch waits at most a few seconds) and keeps it fresh while the app lives. */
export function Discovery({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  return (
    <DiscoveryProvider discovery={discovery} subscribeForeground={onForeground} loading={<View style={{ flex: 1, backgroundColor: theme.surface0 }} />}>
      {children}
    </DiscoveryProvider>
  );
}
