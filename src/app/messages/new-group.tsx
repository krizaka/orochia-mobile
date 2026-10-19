import React, { useCallback, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Check } from "lucide-react-native";
import { Avatar, Button, EmptyState, Skeleton, TextField, Txt, useTheme } from "@krizaka/ui/native";
import { t } from "@/i18n";
import { api } from "@/lib/api";
import { groupBody, groupProblem, MAX_GROUP_MEMBERS, toggleMember } from "@/lib/group-create";
import { withTap } from "@/lib/haptics";
import { space } from "@/lib/theme";

interface Contact {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
}

/**
 * A new group (orochia://messages/new-group): a name and the contacts to add — the web's rules (only contacts, at most
 * 49 besides you; the server makes you the owner and checks them again). Invitation links and later changes: the web.
 */
export default function NewGroup() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const [contacts, setContacts] = useState<Contact[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [title, setTitle] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [problem, setProblem] = useState<"title" | "titleLong" | "members" | "failed" | null>(null);
  const [busy, setBusy] = useState(false);

  useFocusEffect(
    useCallback(() => {
      void api<{ contacts: Contact[] }>("/api/me/network").then(
        (r) => {
          setContacts(r.contacts);
          setLoadError(false);
        },
        () => setLoadError(true),
      );
    }, []),
  );

  const create = async () => {
    const found = groupProblem({ title, memberIds: picked });
    if (found) return setProblem(found);
    setProblem(null);
    setBusy(true);
    try {
      const { conversationId } = await api<{ conversationId: string }>("/api/groups", { method: "POST", body: groupBody({ title, memberIds: picked }) });
      router.replace(`/messages/${conversationId}`);
    } catch {
      setProblem("failed");
      setBusy(false);
    }
  };

  const problemText = problem === "title" ? t("messages.group.problemTitle") : problem === "titleLong" ? t("messages.group.problemTitleLong") : problem === "members" ? t("messages.group.problemMembers") : problem === "failed" ? t("messages.group.failed") : null;
  const full = picked.length >= MAX_GROUP_MEMBERS;

  return (
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: space.lg, gap: space.lg, paddingBottom: insets.bottom + space.xl }}>
      <Txt variant="title">{t("messages.group.newTitle")}</Txt>
      <TextField
        label={t("messages.group.nameLabel")}
        hint={t("messages.group.nameHint")}
        value={title}
        onValueChange={(text) => {
          setTitle(text);
          if (problem) setProblem(null);
        }}
        maxLength={200}
        returnKeyType="done"
      />
      <View style={{ gap: space.sm }}>
        <Txt style={{ fontWeight: "700" }}>{t("messages.group.pickTitle")}</Txt>
        <Txt variant="caption" tone="secondary">
          {t("messages.group.pickHint", { max: MAX_GROUP_MEMBERS })}
        </Txt>
        {contacts === null && !loadError && [0, 1, 2].map((i) => <Skeleton key={i} shape="rect" height={52} />)}
        {loadError && <Txt tone="danger">{t("messages.group.contactsError")}</Txt>}
        {contacts !== null && contacts.length === 0 && <EmptyState title={t("messages.group.noContacts")} />}
        {contacts?.map((c) => {
          const on = picked.includes(c.userId);
          return (
            <Pressable
              key={c.userId}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              accessibilityLabel={`${c.displayName}, @${c.username}`}
              onPress={withTap(() => {
                setPicked((p) => toggleMember(p, c.userId));
                if (problem) setProblem(null);
              })}
              style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: space.md, minHeight: 52, paddingVertical: space.xs, backgroundColor: pressed ? theme.surface2 : "transparent" })}
            >
              <Avatar src={c.avatarUrl} alt={c.displayName} fallback={<Txt>{c.displayName.charAt(0)}</Txt>} size={36} />
              <View style={{ flex: 1 }}>
                <Txt style={{ fontWeight: "600" }}>{c.displayName}</Txt>
                <Txt variant="caption" tone="secondary">{`@${c.username}`}</Txt>
              </View>
              <View
                style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: on ? theme.accent : theme.borderSubtle, backgroundColor: on ? theme.accent : "transparent", alignItems: "center", justifyContent: "center" }}
              >
                {on && <Check size={14} color={theme.onAccent} />}
              </View>
            </Pressable>
          );
        })}
        {full && (
          <Txt variant="caption" tone="secondary">
            {t("messages.group.full")}
          </Txt>
        )}
      </View>
      {picked.length > 0 && (
        <Txt variant="caption" tone="secondary">
          {t("messages.group.picked", { count: picked.length })}
        </Txt>
      )}
      {problemText && (
        <Txt tone="danger" accessibilityRole="alert">
          {problemText}
        </Txt>
      )}
      <Button label={t("messages.group.create")} size="lg" onPress={() => void create()} disabled={busy} />
    </ScrollView>
  );
}
