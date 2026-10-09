import React from "react";
import { FlatList, RefreshControl, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Gavel } from "lucide-react-native";
import { AuctionTile } from "@/components/Tiles";
import { Empty, Skeleton, Txt } from "@/components/ui";
import { t } from "@/i18n";
import { useApi } from "@/lib/useApi";
import { space, useTheme } from "@/lib/theme";
import type { AuctionCard } from "@/lib/types";

/** Open auctions, ending soonest first. */
export default function Auctions() {
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const list = useApi<{ items: AuctionCard[] }>("/api/auctions?tab=open");
  return (
    <FlatList
      data={list.data?.items ?? []}
      keyExtractor={(a) => a.id}
      contentContainerStyle={{ paddingTop: insets.top + space.md, paddingHorizontal: space.lg, paddingBottom: space.xxl, gap: space.md }}
      refreshControl={<RefreshControl refreshing={list.refreshing} onRefresh={() => void list.refresh()} tintColor={c.accent} />}
      ListHeaderComponent={
        <View style={{ gap: space.md, marginBottom: space.sm }}>
          <Txt variant="display">{t("tabs.auctions")}</Txt>
          {list.loading && <Skeleton height={220} />}
        </View>
      }
      ListEmptyComponent={list.loading ? null : <Empty icon={<Gavel size={32} color={c.accent} />} title={t("auction.empty")} body={t("auction.emptyBody")} />}
      renderItem={({ item }) => <AuctionTile a={item} />}
    />
  );
}
