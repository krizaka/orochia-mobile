import React from "react";
import { ScrollView } from "react-native";
import { space } from "@/lib/theme";
import { Chip } from "./ui";

/** A row of tabs as chips; the screen keeps the chosen one in its route params. */
export function Segments<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
      {options.map((o) => (
        <Chip key={o.value} label={o.label} active={o.value === value} onPress={() => onChange(o.value)} />
      ))}
    </ScrollView>
  );
}
