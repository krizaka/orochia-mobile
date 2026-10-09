import React from "react";
import { FlatList, RefreshControl, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Flame } from "lucide-react-native";
import { Segments } from "@/components/Segments";
import { ChallengeTile } from "@/components/Tiles";
import { Empty, Skeleton, Txt } from "@/components/ui";
import { t } from "@/i18n";
import { useAuth } from "@/lib/auth";
import { useApi } from "@/lib/useApi";
import { space, useTheme } from "@/lib/theme";
import type { ChallengeCard } from "@/lib/types";

const TABS = ["open", "calls", "done", "backing"] as const;
type Tab = (typeof TABS)[number];

/** Challenges by tab (in the route: orochia://challenges?tab=done), as on the web. */
export default function Challenges() {
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const { user } = useAuth();
  const params = useLocalSearchParams<{ tab?: string }>();
  const tabs = TABS.filter((id) => id !== "backing" || Boolean(user));
  const tab: Tab = (tabs as readonly string[]).includes(params.tab ?? "") ? (params.tab as Tab) : "open";
  const list = useApi<{ items: ChallengeCard[] }>(`/api/challenges?tab=${tab}`);
  return (
    <FlatList
      data={list.data?.items ?? []}
      keyExtractor={(ch) => ch.id}
      contentContainerStyle={{ paddingTop: insets.top + space.md, paddingHorizontal: space.lg, paddingBottom: space.xxl, gap: space.md }}
      refreshControl={<RefreshControl refreshing={list.refreshing} onRefresh={() => void list.refresh()} tintColor={c.accent} />}
      ListHeaderComponent={
        <View style={{ gap: space.md, marginBottom: space.sm }}>
          <Txt variant="display">{t("challenge.title")}</Txt>
          <Txt tone="textSecondary">{t("challenge.subtitle")}</Txt>
          <Segments value={tab} options={tabs.map((id) => ({ value: id, label: t(`challenge.tabs.${id}`) }))} onChange={(next) => router.setParams({ tab: next })} />
          {list.loading && [0, 1].map((i) => <Skeleton key={i} height={160} />)}
        </View>
      }
      ListEmptyComponent={list.loading ? null : <Empty icon={<Flame size={32} color={c.accent} />} title={t("challenge.empty")} body={t("challenge.emptyBody")} />}
      renderItem={({ item }) => <ChallengeTile ch={item} />}
    />
  );
}
