import React from "react";
import { FlatList, RefreshControl, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Flame } from "lucide-react-native";
import { Chip, EmptyState, Skeleton, Txt, useTheme } from "@krizaka/ui/native";
import { ChallengeTile } from "@/components/Tiles";
import { t } from "@/i18n";
import { useAuth } from "@/lib/auth";
import { useApi } from "@/lib/useApi";
import { space } from "@/lib/theme";
import type { ChallengeCard } from "@/lib/types";

const TABS = ["open", "calls", "done", "backing"] as const;
type Tab = (typeof TABS)[number];

/** Challenges by tab (in the route: orochia://challenges?tab=done), as on the web. */
export default function Challenges() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
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
      refreshControl={<RefreshControl refreshing={list.refreshing} onRefresh={() => void list.refresh()} tintColor={theme.accent} />}
      ListHeaderComponent={
        <View style={{ gap: space.md, marginBottom: space.sm }}>
          <Txt variant="display">{t("challenge.title")}</Txt>
          <Txt tone="secondary">{t("challenge.subtitle")}</Txt>
          <Chip.Group type="single" scrollable aria-label={t("challenge.tabsLabel")} value={tab} onValueChange={(next) => router.setParams({ tab: next })}>
            {tabs.map((id) => (
              <Chip key={id} value={id}>
                {t(`challenge.tabs.${id}`)}
              </Chip>
            ))}
          </Chip.Group>
          {list.loading && [0, 1].map((i) => <Skeleton key={i} shape="rect" height={200} />)}
        </View>
      }
      ListEmptyComponent={list.loading ? null : <EmptyState icon={<Flame size={24} color={theme.accent} />} title={t("challenge.empty")} description={t("challenge.emptyBody")} />}
      renderItem={({ item }) => <ChallengeTile ch={item} />}
    />
  );
}
