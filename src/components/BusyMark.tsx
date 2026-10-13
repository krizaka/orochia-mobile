import React from "react";
import { View } from "react-native";
import { Txt } from "@krizaka/ui/native";
import { space } from "@/lib/theme";
import { OrochiaMark } from "./OrochiaMark";

/**
 * A wait in words, carried by the animated Orochia mark of @krizaka/ui (still when the system reduces motion): shown
 * while the account screens submit or verify, announced to screen readers.
 */
export function BusyMark({ label }: { label: string }) {
  return (
    <View accessible accessibilityRole="progressbar" accessibilityLabel={label} accessibilityLiveRegion="polite" style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: space.sm }}>
      <OrochiaMark size={28} />
      <Txt variant="caption" tone="secondary">
        {label}
      </Txt>
    </View>
  );
}
