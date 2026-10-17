import React, { useCallback, useState } from "react";
import { Alert, ScrollView, Switch, View } from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Avatar, Badge, Button, Skeleton, Txt, useTheme } from "@krizaka/ui/native";
import { t } from "@/i18n";
import { api } from "@/lib/api";
import { space } from "@/lib/theme";

interface Member {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  role: "owner" | "member";
}
interface Group {
  title: string | null;
  archived: boolean;
  muted: boolean;
  role: "owner" | "member";
  members: Member[];
}

const MUTE_HOURS = 8;

/** A group's details (orochia://messages/group/<id>): members, mute, leave. Adding people and invitation links: the web. */
export default function GroupDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const [group, setGroup] = useState<Group | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    try {
      setGroup((await api<{ group: Group }>(`/api/groups/${id}`)).group);
      setError(false);
    } catch {
      setError(true);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const mute = async (on: boolean) => {
    setGroup((g) => (g ? { ...g, muted: on } : g));
    await api(`/api/groups/${id}/mute`, { method: "POST", body: { hours: on ? MUTE_HOURS : null } }).catch(() => undefined);
    void load();
  };

  const leave = () =>
    Alert.alert(t("messages.group.leaveTitle"), t("messages.group.leaveBody"), [
      { text: t("messages.group.cancel"), style: "cancel" },
      {
        text: t("messages.group.leave"),
        style: "destructive",
        onPress: () => void api(`/api/groups/${id}/leave`, { method: "POST" }).then(() => router.replace("/messages"), () => setError(true)),
      },
    ]);

  if (!group) {
    return (
      <View style={{ padding: space.lg, gap: space.md }}>
        {error ? <Txt tone="danger">{t("messages.error")}</Txt> : [0, 1, 2].map((i) => <Skeleton key={i} shape="rect" height={44} />)}
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.lg, paddingBottom: insets.bottom + space.xl }}>
      <Txt variant="title">{group.title}</Txt>
      {group.archived && <Txt tone="secondary">{t("messages.group.closed")}</Txt>}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.md }}>
        <View style={{ flex: 1 }}>
          <Txt style={{ fontWeight: "600" }}>{t("messages.group.mute")}</Txt>
          <Txt variant="caption" tone="secondary">
            {t("messages.group.muteHint")}
          </Txt>
        </View>
        <Switch value={group.muted} onValueChange={(on) => void mute(on)} accessibilityLabel={t("messages.group.mute")} trackColor={{ true: theme.accent }} />
      </View>
      <View style={{ gap: space.sm }}>
        <Txt variant="caption" tone="secondary" style={{ fontWeight: "700" }}>
          {`${t("messages.group.membersTitle")} · ${group.members.length}`}
        </Txt>
        {group.members.map((m) => (
          <View key={m.userId} style={{ flexDirection: "row", alignItems: "center", gap: space.md, paddingVertical: space.xs }}>
            <Avatar src={m.avatarUrl} alt={m.displayName} fallback={<Txt>{m.displayName.charAt(0)}</Txt>} size={36} />
            <View style={{ flex: 1 }}>
              <Txt style={{ fontWeight: "600" }}>{m.displayName}</Txt>
              <Txt variant="caption" tone="secondary">{`@${m.username}`}</Txt>
            </View>
            {m.role === "owner" && <Badge tone="accent">{t("messages.group.owner")}</Badge>}
          </View>
        ))}
      </View>
      {group.role === "owner" && !group.archived && (
        <Txt variant="caption" tone="secondary">
          {t("messages.group.manageOnWeb")}
        </Txt>
      )}
      <Button label={t("messages.group.leave")} variant="secondary" onPress={leave} />
    </ScrollView>
  );
}
