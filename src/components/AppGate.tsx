import React from "react";
import { Linking } from "react-native";
import type { Decision } from "@krizaka/app-config/client";
import { ForceUpdateScreen, MaintenanceScreen, UpdatePrompt } from "@krizaka/ui/native";
import { t } from "@/i18n";
import { OrochiaMark } from "./OrochiaMark";

/**
 * What the app-version contract decided (krizaka/.github#75): maintenance or a forced update replace the app, a soft
 * update is a prompt the person may dismiss; otherwise the app itself. The texts come from the server when it sends one.
 */
export function AppGate({ decision, onDismiss, onRetry, children }: { decision: Decision; onDismiss: () => void; onRetry: () => void; children: React.ReactNode }) {
  const open = (url: string | null) => {
    if (url) void Linking.openURL(url);
  };
  if (decision.kind === "maintenance") {
    return <MaintenanceScreen fill mark={<OrochiaMark size={64} />} title={t("update.maintenanceTitle")} message={decision.config.maintenance.message ?? undefined} retryLabel={t("common.retry")} onRetry={onRetry} />;
  }
  if (decision.kind === "force") {
    const c = decision.config;
    return <ForceUpdateScreen fill mark={<OrochiaMark size={64} />} title={t("update.forceTitle")} message={c.message ?? undefined} versionLabel={t("update.version", { version: c.latestVersion })} updateLabel={t("update.update")} onUpdate={() => open(c.storeUrl)} retryLabel={t("common.retry")} onRetry={onRetry} />;
  }
  return (
    <>
      {children}
      {decision.kind === "soft" ? (
        <UpdatePrompt title={t("update.softTitle")} message={decision.config.message ?? undefined} versionLabel={t("update.version", { version: decision.config.latestVersion })} updateLabel={t("update.update")} onUpdate={() => open(decision.config.storeUrl)} laterLabel={t("update.later")} onLater={onDismiss} />
      ) : null}
    </>
  );
}
