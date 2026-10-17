import React from "react";
import { FlatList, RefreshControl, View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { ExternalLink } from "lucide-react-native";
import { Avatar, Button, EmptyState, Skeleton, Txt, useTheme } from "@krizaka/ui/native";
import { VideoTile } from "@/components/Tiles";
import { t } from "@/i18n";
import { absoluteUrl, OROCHIA_URL } from "@/lib/config";
import { withTap } from "@/lib/haptics";
import { space } from "@/lib/theme";
import type { VideoSummary } from "@/lib/types";
import { useApi } from "@/lib/useApi";

interface Profile {
  creator: { username: string; displayName: string; bio: string | null; avatarUrl: string | null };
  videos: VideoSummary[];
}

/** A public profile (the page a shared `orochia.com/@handle` link opens): who they are, then their videos — media first. */
export default function PublicProfile() {
  const { handle } = useLocalSearchParams<{ handle: string }>();
  const { theme } = useTheme();
  const profile = useApi<Profile>(`/api/creators/${encodeURIComponent(handle)}`);
  const creator = profile.data?.creator;
  if (!creator) {
    return (
      <View style={{ padding: space.lg }}>
        <Stack.Screen options={{ title: `@${handle}` }} />
        {profile.loading ? <Skeleton shape="rect" height={160} /> : <EmptyState title={t("profile.notFound")} />}
      </View>
    );
  }
  return (
    <FlatList
      data={profile.data?.videos ?? []}
      keyExtractor={(v) => v.id}
      contentContainerStyle={{ padding: space.lg, gap: space.xl }}
      refreshControl={<RefreshControl refreshing={profile.refreshing} onRefresh={() => void profile.refresh()} tintColor={theme.accent} />}
      ListHeaderComponent={
        <View style={{ gap: space.md }}>
          <Stack.Screen options={{ title: `@${creator.username}` }} />
          <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
            <Avatar src={absoluteUrl(creator.avatarUrl)} alt={creator.displayName} size="lg" />
            <View style={{ flex: 1 }}>
              <Txt variant="title">{creator.displayName}</Txt>
              <Txt tone="secondary">@{creator.username}</Txt>
            </View>
          </View>
          {creator.bio ? <Txt tone="secondary">{creator.bio}</Txt> : null}
          <Button label={t("profile.openWeb")} variant="secondary" size="md" icon={<ExternalLink size={14} color={theme.textPrimary} />} onPress={withTap(() => void WebBrowser.openBrowserAsync(`${OROCHIA_URL}/@${creator.username}`))} />
          <Txt variant="label">{t("profile.videos")}</Txt>
        </View>
      }
      ListEmptyComponent={<Txt tone="secondary">{t("profile.empty")}</Txt>}
      renderItem={({ item }) => <VideoTile v={item} />}
    />
  );
}
