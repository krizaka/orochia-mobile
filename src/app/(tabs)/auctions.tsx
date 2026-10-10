import React from "react";
import { FlatList, RefreshControl, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Gavel } from "lucide-react-native";
import { EmptyState, Skeleton, Txt, useTheme } from "@krizaka/ui/native";
import { AuctionTile } from "@/components/Tiles";
import { t } from "@/i18n";
import { useApi } from "@/lib/useApi";
import { space } from "@/lib/theme";
import type { AuctionCard } from "@/lib/types";

/** Open auctions, ending soonest first. */
export default function Auctions() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const list = useApi<{ items: AuctionCard[] }>("/api/auctions?tab=open");
  return (
    <FlatList
      data={list.data?.items ?? []}
      keyExtractor={(a) => a.id}
      contentContainerStyle={{ paddingTop: insets.top + space.md, paddingHorizontal: space.lg, paddingBottom: space.xxl, gap: space.md }}
      refreshControl={<RefreshControl refreshing={list.refreshing} onRefresh={() => void list.refresh()} tintColor={theme.accent} />}
      ListHeaderComponent={
        <View style={{ gap: space.md, marginBottom: space.sm }}>
          <Txt variant="display">{t("tabs.auctions")}</Txt>
          {list.loading && <Skeleton shape="rect" height={300} />}
        </View>
      }
      ListEmptyComponent={list.loading ? null : <EmptyState icon={<Gavel size={24} color={theme.accent} />} title={t("auction.empty")} description={t("auction.emptyBody")} />}
      renderItem={({ item }) => <AuctionTile a={item} />}
    />
  );
}
