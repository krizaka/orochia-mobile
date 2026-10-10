import React from "react";
import * as Haptics from "expo-haptics";
import { Chip } from "@krizaka/ui/native";
import { usd } from "@/i18n";

/** One-tap amounts (the server's suggestions), as a single-choice chip group. */
export function AmountPicker({ amounts, value, onChange, label }: { amounts: number[]; value: number; onChange: (cents: number) => void; label: string }) {
  return (
    <Chip.Group
      type="single"
      aria-label={label}
      value={String(value)}
      onValueChange={(next) => {
        void Haptics.selectionAsync().catch(() => undefined);
        onChange(Number(next));
      }}
    >
      {amounts.map((a) => (
        <Chip key={a} value={String(a)}>
          {usd(a)}
        </Chip>
      ))}
    </Chip.Group>
  );
}
