import React, { useCallback, useEffect, useState } from "react";
import { AppState, Linking, ScrollView, Switch, View } from "react-native";
import * as Notifications from "expo-notifications";
import { BellOff } from "lucide-react-native";
import { Button, Card, Mascot, Skeleton, Txt, useTheme } from "@krizaka/ui/native";
import { t } from "@/i18n";
import { api } from "@/lib/api";
import { errorText } from "@/lib/errors";
import { GROUPS, groupOn, type NotificationGroup, setGroup } from "@/lib/notification-prefs";
import { useApi } from "@/lib/useApi";
import { space } from "@/lib/theme";

/** Whether the phone lets Orochia notify at all (asked after sign-in; changed later only in the system settings). */
function usePhoneAllows(): boolean | null {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const check = useCallback(() => {
    void Notifications.getPermissionsAsync()
      .then((p) => setAllowed(p.granted))
      .catch(() => setAllowed(null));
  }, []);
  useEffect(() => {
    check();
    // Back from the system settings: read it again.
    const sub = AppState.addEventListener("change", (s) => s === "active" && check());
    return () => sub.remove();
  }, [check]);
  return allowed;
}

/**
 * What reaches this account, by kind (orochia://settings/notifications): one switch per kind turns its notifications
 * on or off in the app — the bell, the toasts and this phone's push — saved at once (`PUT /api/me/profile`). E-mail and
 * the per-event switches stay on orochia.com. If the phone itself refuses Orochia's notifications, that comes first,
 * with the way to the system settings.
 */
export default function NotificationSettings() {
  const { theme } = useTheme();
  const profile = useApi<{ profile: { inAppOff: string[] | null } }>("/api/me/profile");
  // What was saved here wins over what was loaded (no reload between switches).
  const [saved, setOff] = useState<string[] | null>(null);
  const off = saved ?? (profile.data ? (profile.data.profile.inAppOff ?? []) : null);
  const [error, setError] = useState<string | null>(null);
  const phone = usePhoneAllows();

  const toggle = async (group: NotificationGroup, on: boolean) => {
    if (!off) return;
    const before = off;
    const next = setGroup(off, group, on);
    setOff(next);
    setError(null);
    try {
      await api("/api/me/profile", { method: "PUT", body: { inAppOff: next } });
    } catch (e) {
      setOff(before);
      setError(errorText(e));
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.lg }}>
      <View style={{ flexDirection: "row", gap: space.md, alignItems: "center" }}>
        <Mascot bird="pigeon" mood="welcome" size={56} />
        <Txt tone="secondary" style={{ flex: 1 }}>
          {t("prefs.intro")}
        </Txt>
      </View>

      {phone === false && (
        <Card.Root>
          <Card.Body style={{ gap: space.sm }}>
            <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
              <BellOff size={16} color={theme.warning} />
              <Txt variant="label">{t("prefs.phoneOff")}</Txt>
            </View>
            <Txt tone="secondary">{t("prefs.phoneOffHint")}</Txt>
            <Button label={t("prefs.openSettings")} variant="secondary" onPress={() => void Linking.openSettings()} />
          </Card.Body>
        </Card.Root>
      )}

      {off === null ? (
        profile.error ? <Txt tone="danger">{errorText(profile.error)}</Txt> : <Skeleton shape="rect" height={360} />
      ) : (
        <Card.Root>
          <Card.Body style={{ gap: 0 }}>
            {GROUPS.map((group, i) => {
              const on = groupOn(off, group);
              return (
                <View
                  key={group}
                  style={{ flexDirection: "row", alignItems: "center", gap: space.md, paddingVertical: space.md, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: theme.borderSubtle }}
                >
                  <View style={{ flex: 1, gap: 2 }}>
                    <Txt variant="label">{t(`prefs.groups.${group}.title`)}</Txt>
                    <Txt variant="caption" tone="secondary">
                      {t(`prefs.groups.${group}.hint`)}
                    </Txt>
                  </View>
                  <Switch
                    value={on}
                    onValueChange={(value) => void toggle(group, value)}
                    accessibilityLabel={t(`prefs.groups.${group}.title`)}
                    accessibilityHint={t(`prefs.groups.${group}.hint`)}
                    trackColor={{ true: theme.accent, false: theme.surface2 }}
                    thumbColor={theme.surface0}
                    testID={`prefs-${group}`}
                  />
                </View>
              );
            })}
          </Card.Body>
        </Card.Root>
      )}
      {error && <Txt tone="danger">{error}</Txt>}
      <Txt variant="caption" tone="muted">
        {t("prefs.emailOnWeb")}
      </Txt>
    </ScrollView>
  );
}
