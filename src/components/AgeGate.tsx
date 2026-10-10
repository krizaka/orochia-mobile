import React from "react";
import { Linking, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { ShieldCheck } from "lucide-react-native";
import { Button, Txt, useTheme } from "@krizaka/ui/native";
import { t } from "@/i18n";
import { OROCHIA_URL } from "@/lib/config";
import { withTap } from "@/lib/haptics";
import { signature, space } from "@/lib/theme";
import { OrochiaMark } from "./OrochiaMark";

/** The 18+ gate, before anything else: Orochia is for adults; leaving is one tap. */
export function AgeGate({ onConfirm }: { onConfirm: () => void }) {
  const { theme } = useTheme();
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.surface0, justifyContent: "center", padding: space.xl }]}>
      <LinearGradient colors={[`${signature[0]}40`, "transparent"]} style={StyleSheet.absoluteFill} />
      <View style={{ alignItems: "center", gap: space.lg }}>
        <OrochiaMark size={72} />
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <ShieldCheck size={14} color={theme.accent} />
          <Txt variant="caption" tone="accent" style={{ fontWeight: "800" }}>
            {t("age.badge")}
          </Txt>
        </View>
        <Txt variant="display" style={{ textAlign: "center" }}>
          {t("age.title")}
        </Txt>
        <Txt tone="secondary" style={{ textAlign: "center" }}>
          {t("age.body")}
        </Txt>
        <Button label={t("age.enter")} variant="primary" size="lg" onPress={withTap(onConfirm)} style={{ alignSelf: "stretch", marginTop: space.lg }} />
        <Button label={t("age.terms")} variant="secondary" size="lg" onPress={withTap(() => void Linking.openURL(`${OROCHIA_URL}/legal/terms`))} style={{ alignSelf: "stretch" }} />
      </View>
    </View>
  );
}
