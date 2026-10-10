import React from "react";
import { OrochiaMark as Mark, useTheme } from "@krizaka/ui/native";

/** The animated Orochia mark from @krizaka/ui (never a copy), with the theme's border as its neutral strokes. */
export function OrochiaMark({ size = 40, title }: { size?: number; title?: string }) {
  const { theme } = useTheme();
  return <Mark size={size} title={title} neutral={theme.borderDefault} />;
}
