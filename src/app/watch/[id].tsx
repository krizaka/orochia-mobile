import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import { Image } from "expo-image";
import * as WebBrowser from "expo-web-browser";
import { Lock } from "lucide-react-native";
import { Avatar, Button, Skeleton, Txt, useTheme } from "@krizaka/ui/native";
import { VideoTile } from "@/components/Tiles";
import { compact, t, usd, type MessageKey } from "@/i18n";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { OROCHIA_URL, absoluteUrl } from "@/lib/config";
import { withTap } from "@/lib/haptics";
import { space } from "@/lib/theme";
import type { StreamAccess, VideoDetails } from "@/lib/types";

/** The player: HLS signed for this viewer by the server (5-minute token), never a raw URL. */
function Player({ uri, poster }: { uri: string; poster: string | null }) {
  const player = useVideoPlayer({ uri, contentType: "hls" }, (p) => p.play());
  const { radius } = useTheme();
  return (
    <View style={[styles.video, { borderRadius: radius.sm }]}>
      {poster ? <Image source={poster} style={StyleSheet.absoluteFill} contentFit="cover" /> : null}
      <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="contain" nativeControls fullscreenOptions={{ enable: true }} allowsPictureInPicture />
    </View>
  );
}

/**
 * A video: the server decides whether this viewer may play it (`/api/videos/<id>/stream`); when not, the reason is
 * shown — and paying (unlocks, tips) happens on orochia.com, through the payment provider's own checkout.
 */
export default function Watch() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme, radius } = useTheme();
  const { user } = useAuth();
  const [details, setDetails] = useState<VideoDetails | null>(null);
  const [access, setAccess] = useState<StreamAccess | null>(null);

  useEffect(() => {
    let live = true;
    void api<{ video: VideoDetails }>(`/api/videos/${id}/details`).then((d) => live && setDetails(d.video)).catch(() => undefined);
    void api<StreamAccess>(`/api/videos/${id}/stream`)
      .then((a) => live && setAccess(a))
      .catch((e: unknown) => live && setAccess(e instanceof ApiError ? (e.body as StreamAccess) : { allowed: false, reason: "NOT_FOUND" }));
    return () => {
      live = false;
    };
  }, [id, user?.id]);

  const poster = absoluteUrl(details?.thumbnailUrl);
  const reason = access && !access.allowed ? (!user && access.reason !== "NOT_FOUND" && access.reason !== "PAYWALL_REQUIRED" ? "SIGN_IN" : access.reason) : null;
  return (
    <ScrollView contentContainerStyle={{ paddingBottom: space.xxl }}>
      <Stack.Screen options={{ title: details?.title ?? "" }} />
      {!access ? (
        <Skeleton shape="rect" height={220} style={{ borderRadius: 0 }} />
      ) : access.allowed ? (
        <Player uri={access.streamUrl} poster={poster} />
      ) : (
        <View style={[styles.video, { borderRadius: radius.sm, alignItems: "center", justifyContent: "center", gap: space.md, padding: space.xl }]}>
          {poster ? <Image source={poster} style={StyleSheet.absoluteFill} contentFit="cover" blurRadius={30} /> : null}
          <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.scrim }]} />
          <Lock color={theme.textOnMedia} size={28} />
          <Txt tone="onMedia" style={{ textAlign: "center" }}>{t(`video.locked.${reason}` as MessageKey, { amount: usd(access.minTipAmountCents ?? 0) })}</Txt>
          {reason === "SIGN_IN" ? (
            <Button label={t("video.signIn")} variant="primary" size="lg" onPress={withTap(() => router.push("/me"))} />
          ) : reason === "PAYWALL_REQUIRED" ? (
            <Button label={t("video.unlockOnWeb")} variant="primary" size="lg" onPress={withTap(() => void WebBrowser.openBrowserAsync(`${OROCHIA_URL}/watch/${id}`))} />
          ) : null}
        </View>
      )}
      {details && (
        <View style={{ padding: space.lg, gap: space.lg }}>
          <Txt variant="title">{details.title}</Txt>
          <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
            <Avatar src={absoluteUrl(details.creatorAvatar)} alt={details.creatorName} size={36} />
            <View>
              <Txt variant="label">{details.creatorName}</Txt>
              <Txt variant="caption" tone="secondary">
                {t("video.views", { count: compact(details.viewsCount) })}
              </Txt>
            </View>
          </View>
          {details.description ? <Txt tone="secondary">{details.description}</Txt> : null}
          {details.moreFromCreator.length > 0 && (
            <View style={{ gap: space.lg }}>
              <Txt variant="title">{t("video.more", { name: details.creatorName })}</Txt>
              {details.moreFromCreator.slice(0, 4).map((v) => (
                <VideoTile key={v.id} v={v} />
              ))}
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  video: { width: "100%", aspectRatio: 16 / 9, backgroundColor: "#000", overflow: "hidden" },
});
