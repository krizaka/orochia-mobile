import React from "react";
import { View } from "react-native";
import { usd } from "@/i18n";
import { space } from "@/lib/theme";
import { Chip } from "./ui";

/** One-tap amounts (the server's suggestions). */
export function AmountPicker({ amounts, value, onChange }: { amounts: number[]; value: number; onChange: (cents: number) => void }) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>
      {amounts.map((a) => (
        <Chip key={a} label={usd(a)} active={a === value} onPress={() => onChange(a)} />
      ))}
    </View>
  );
}
