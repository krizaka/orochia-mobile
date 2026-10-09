import { useColorScheme } from "react-native";
import { gradientStops, themes, type ThemeColors } from "@krizaka/orochia-design-system/tokens";

/**
 * The Orochia palette, by role, from the design system's tokens — the same colours the web kit's dark and light
 * themes use. The app follows the system's appearance.
 */
export interface Theme {
  dark: boolean;
  c: ThemeColors;
  gradient: readonly [string, string, ...string[]];
}

export function useTheme(): Theme {
  const dark = useColorScheme() !== "light";
  const [a, b, ...rest] = gradientStops.velvet;
  return { dark, c: dark ? themes.dark : themes.light, gradient: [a, b, ...rest] };
}

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 8, md: 12, lg: 16, xl: 24, full: 999 } as const;
