import { gradientStops } from "@krizaka/orochia-design-system/tokens";

/**
 * Colours, radii and the mode come from `useTheme()` of `@krizaka/ui/native`, under the Orochia roles (`nativeTheme`
 * of the design system, given to the `ThemeProvider` at the root). This file only keeps what is the app's layout:
 * its spacing scale, and the signature gradient (a brand value) for the stories ring and the age gate's glow.
 */
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

const [a, b, ...rest] = gradientStops.velvet;
/** Violet → fuchsia → pink, as stops for expo-linear-gradient. */
export const signature: readonly [string, string, ...string[]] = [a, b, ...rest];
