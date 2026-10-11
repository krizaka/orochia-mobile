import React from "react";
import { ChartsProvider } from "@krizaka/charts/native";
import { useTheme } from "@krizaka/ui/native";
import { t } from "@/i18n";

/**
 * Every chart of the app in the Orochia palette (violet first), on the app's theme and scheme (the `nativeTheme` roles,
 * so the brand's overrides apply), with the app's words. Mounted once, inside the ThemeProvider.
 */
export function Charts({ children }: { children: React.ReactNode }) {
  const { theme, scheme } = useTheme();
  return (
    <ChartsProvider brand="orochia" locale="en-US" scheme={scheme} theme={theme} labels={{ empty: t("charts.empty"), loading: t("charts.loading") }}>
      {children}
    </ChartsProvider>
  );
}
