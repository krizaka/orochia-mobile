import React from "react";
import { OrochiaMark as Mark } from "@krizaka/ui/native";
import { useTheme } from "@/lib/theme";

/** The animated Orochia mark from @krizaka/ui (never a copy), with the theme's border as its neutral strokes. */
export function OrochiaMark({ size = 40, title }: { size?: number; title?: string }) {
  const { c } = useTheme();
  return <Mark size={size} title={title} neutral={c.border} />;
}
