import React, { useState } from "react";
import { FlatList, RefreshControl, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Clapperboard } from "lucide-react-native";
import { OrochiaMark } from "@/components/OrochiaMark";
import { StoriesRail } from "@/components/StoriesRail";
import { VideoTile } from "@/components/Tiles";
import { Empty, Skeleton, Txt } from "@/components/ui";
import { t } from "@/i18n";
import { useApi } from "@/lib/useApi";
import { space, useTheme } from "@/lib/theme";
import type { StoryRing, VideoSummary } from "@/lib/types";

/** Home: the stories of the creators the viewer may see, then the feed — everything read from the API. */
export default function Home() {
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const feed = useApi<{ videos: VideoSummary[] }>("/api/feed?limit=30");
  const stories = useApi<{ rings: StoryRing[] }>("/api/stories");
  const [refreshing, setRefreshing] = useState(false);
  const refresh = async () => {
    setRefreshing(true);
    await Promise.all([feed.refresh(), stories.refresh()]);
    setRefreshing(false);
  };
  const videos = feed.data?.videos ?? [];
  return (
    <FlatList
      data={videos}
      keyExtractor={(v) => v.id}
      contentContainerStyle={{ paddingTop: insets.top + space.md, paddingHorizontal: space.lg, paddingBottom: space.xxl, gap: space.xl }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} tintColor={c.accent} />}
      ListHeaderComponent={
        <View style={{ gap: space.lg }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
            <OrochiaMark size={36} title={t("app.name")} />
            <Txt variant="title" style={{ letterSpacing: 2 }}>
              {t("app.name").toUpperCase()}
            </Txt>
          </View>
          {(stories.data?.rings.length ?? 0) > 0 && <StoriesRail rings={stories.data?.rings ?? []} />}
          <Txt variant="title">{t("home.trending")}</Txt>
          {feed.loading && [0, 1].map((i) => <Skeleton key={i} height={220} />)}
        </View>
      }
      ListEmptyComponent={
        feed.loading ? null : <Empty icon={<Clapperboard size={32} color={c.accent} />} title={feed.error ? t("home.error") : t("home.empty")} body={feed.error ? undefined : t("home.emptyBody")} />
      }
      renderItem={({ item }) => <VideoTile v={item} />}
    />
  );
}
