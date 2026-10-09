import React from "react";
import { Linking, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { ShieldCheck } from "lucide-react-native";
import { t } from "@/i18n";
import { OROCHIA_URL } from "@/lib/config";
import { space, useTheme } from "@/lib/theme";
import { Button, Txt } from "./ui";
import { OrochiaMark } from "./OrochiaMark";

/** The 18+ gate, before anything else: Orochia is for adults; leaving is one tap. */
export function AgeGate({ onConfirm }: { onConfirm: () => void }) {
  const { c, gradient } = useTheme();
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: c.background, justifyContent: "center", padding: space.xl }]}>
      <LinearGradient colors={[`${gradient[0]}40`, "transparent"]} style={StyleSheet.absoluteFill} />
      <View style={{ alignItems: "center", gap: space.lg }}>
        <OrochiaMark size={72} />
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <ShieldCheck size={14} color={c.accent} />
          <Txt variant="caption" tone="accent" style={{ fontWeight: "800" }}>
            {t("age.badge")}
          </Txt>
        </View>
        <Txt variant="display" style={{ textAlign: "center" }}>
          {t("age.title")}
        </Txt>
        <Txt tone="textSecondary" style={{ textAlign: "center" }}>
          {t("age.body")}
        </Txt>
        <Button label={t("age.enter")} onPress={onConfirm} style={{ alignSelf: "stretch", marginTop: space.lg }} />
        <Button label={t("age.terms")} variant="secondary" onPress={() => void Linking.openURL(`${OROCHIA_URL}/legal/terms`)} style={{ alignSelf: "stretch" }} />
      </View>
    </View>
  );
}
