import React, { useCallback, useEffect, useState } from "react";
import { Animated, Easing, Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useVideoPlayer, VideoView } from "expo-video";
import { useEvent } from "expo";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { X } from "lucide-react-native";
import { alpha, Avatar, Txt, useTheme } from "@krizaka/ui/native";
import { t } from "@/i18n";
import { api } from "@/lib/api";
import { absoluteUrl } from "@/lib/config";
import { signature, space } from "@/lib/theme";
import type { StoryItem, StoryRing } from "@/lib/types";

const IMAGE_MS = 5000;

/** One ring per creator, unseen ones circled in the signature gradient; a tap opens their stories full screen. */
export function StoriesRail({ rings }: { rings: StoryRing[] }) {
  const { theme } = useTheme();
  const [open, setOpen] = useState<number | null>(null);
  return (
    <>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.md }}>
        {rings.map((ring, i) => (
          <Pressable key={ring.creatorId} accessibilityRole="button" accessibilityLabel={ring.displayName} onPress={() => setOpen(i)} style={{ alignItems: "center", width: 72, gap: 6 }}>
            <LinearGradient colors={ring.allSeen ? [theme.borderDefault, theme.borderDefault] : signature} style={styles.ring}>
              <View style={[styles.ringInner, { backgroundColor: theme.surface0 }]}>
                <Avatar src={absoluteUrl(ring.avatarUrl)} alt={ring.displayName} size={60} />
              </View>
            </LinearGradient>
            <Txt variant="caption" numberOfLines={1} tone="secondary">
              {ring.displayName}
            </Txt>
          </Pressable>
        ))}
      </ScrollView>
      {open !== null && <StoryViewer rings={rings} start={open} onClose={() => setOpen(null)} />}
    </>
  );
}

function StoryMedia({ story, onEnd }: { story: StoryItem; onEnd: () => void }) {
  const player = useVideoPlayer(story.type === "video" ? { uri: story.url, contentType: "hls" } : null, (p) => {
    p.loop = false;
    p.play();
  });
  const ended = useEvent(player, "playToEnd");
  useEffect(() => {
    if (ended) onEnd();
  }, [ended, onEnd]);
  if (story.type === "image") return <Image source={absoluteUrl(story.url)} style={StyleSheet.absoluteFill} contentFit="contain" />;
  return <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="contain" nativeControls={false} />;
}

/** The stories full screen: progress bars, tap right for the next one, left for the previous, the cross to leave. */
function StoryViewer({ rings, start, onClose }: { rings: StoryRing[]; start: number; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const [ringIndex, setRingIndex] = useState(start);
  const [storyIndex, setStoryIndex] = useState(0);
  const [progress] = useState(() => new Animated.Value(0));
  const ring = rings[ringIndex];
  const story = ring?.stories[storyIndex];

  const next = useCallback(() => {
    if (!ring) return onClose();
    if (storyIndex + 1 < ring.stories.length) return setStoryIndex(storyIndex + 1);
    if (ringIndex + 1 < rings.length) {
      setRingIndex(ringIndex + 1);
      return setStoryIndex(0);
    }
    onClose();
  }, [ring, storyIndex, ringIndex, rings.length, onClose]);
  const previous = () => {
    if (storyIndex > 0) return setStoryIndex(storyIndex - 1);
    if (ringIndex > 0) {
      setRingIndex(ringIndex - 1);
      setStoryIndex(0);
    }
  };

  useEffect(() => {
    if (!story) return;
    void api(`/api/stories/${story.id}/view`, { method: "POST" }).catch(() => undefined);
    progress.setValue(0);
    const ms = story.type === "image" ? IMAGE_MS : Math.max(1000, story.durationSeconds * 1000);
    const run = Animated.timing(progress, { toValue: 1, duration: ms, easing: Easing.linear, useNativeDriver: false });
    run.start(({ finished }) => finished && story.type === "image" && next());
    return () => run.stop();
  }, [story, progress, next]);

  if (!ring || !story) return null;
  return (
    <Modal visible animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.viewer}>
        <StoryMedia key={story.id} story={story} onEnd={next} />
        <View style={[styles.top, { paddingTop: insets.top + space.sm }]}>
          <View style={styles.bars}>
            {ring.stories.map((s, i) => (
              <View key={s.id} style={[styles.bar, { backgroundColor: alpha(theme.textOnMedia, 0.3) }]}>
                <Animated.View style={[styles.fill, { backgroundColor: theme.textOnMedia, width: i < storyIndex ? "100%" : i === storyIndex ? progress.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }) : "0%" }]} />
              </View>
            ))}
          </View>
          <View style={styles.header}>
            <Avatar src={absoluteUrl(ring.avatarUrl)} alt={ring.displayName} size="sm" />
            <Txt variant="label" tone="onMedia" style={{ flex: 1 }}>
              {ring.displayName}
            </Txt>
            <Pressable accessibilityRole="button" accessibilityLabel={t("common.close")} onPress={onClose} hitSlop={12}>
              <X color={theme.textOnMedia} size={26} />
            </Pressable>
          </View>
        </View>
        <View style={styles.zones}>
          <Pressable style={{ flex: 1 }} onPress={previous} />
          <Pressable style={{ flex: 2 }} onPress={next} />
        </View>
        {story.caption ? (
          <View style={[styles.caption, { backgroundColor: theme.scrim, paddingBottom: insets.bottom + space.lg }]}>
            <Txt tone="onMedia">{story.caption}</Txt>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  ring: { width: 68, height: 68, borderRadius: 34, padding: 2.5 },
  ringInner: { flex: 1, borderRadius: 32, padding: 2, alignItems: "center", justifyContent: "center" },
  viewer: { flex: 1, backgroundColor: "#000" },
  top: { position: "absolute", left: 0, right: 0, paddingHorizontal: space.md, zIndex: 2 },
  bars: { flexDirection: "row", gap: 4 },
  bar: { flex: 1, height: 2.5, borderRadius: 2, overflow: "hidden" },
  fill: { height: "100%" },
  header: { flexDirection: "row", alignItems: "center", gap: space.sm, marginTop: space.md },
  zones: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, flexDirection: "row", zIndex: 1 },
  caption: { position: "absolute", left: 0, right: 0, bottom: 0, padding: space.lg, zIndex: 2 },
});
