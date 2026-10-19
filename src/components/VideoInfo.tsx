import React, { useState } from "react";
import { Pressable, View } from "react-native";
import { Sparkles } from "lucide-react-native";
import { Badge, Txt, useTheme } from "@krizaka/ui/native";
import { clock as clockOf, aiCreditOf, aspectLabel, qualityLabel, shortRunId } from "@/lib/video-info";
import { intlLocale, t } from "@/i18n";
import { space } from "@/lib/theme";
import type { VideoDetails } from "@/lib/types";

/**
 * What the video is, read from the file: one quiet line under the title (quality · shape · length · frame rate · date),
 * and — for an AI-made clip — one small badge that opens how it was made (run, model, hardware). The same facts as the
 * web watch page, never boxed.
 */
export function VideoInfo({ video }: { video: Pick<VideoDetails, "width" | "height" | "framerate" | "createdAt" | "durationSeconds" | "description" | "aiProvenance"> }) {
  const { theme } = useTheme();
  const [open, setOpen] = useState(false);
  const credit = aiCreditOf(video);
  const fps = video.framerate ? t("video.info.fps", { fps: Number(video.framerate.toFixed(video.framerate % 1 < 0.01 ? 0 : 1)) }) : null;
  const date = video.createdAt ? new Date(video.createdAt).toLocaleDateString(intlLocale(), { dateStyle: "medium" }) : null;
  const line = [qualityLabel(video.width, video.height) ?? (video.width && video.height ? `${video.width}×${video.height}` : null), aspectLabel(video.width, video.height), clockOf(video.durationSeconds), fps, date].filter(Boolean).join(" · ");
  return (
    <View style={{ gap: space.sm }}>
      <Txt variant="caption" tone="secondary" accessibilityLabel={line}>
        {line}
      </Txt>
      {credit && (
        <View style={{ gap: space.sm }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={open ? t("video.info.ai.hide") : t("video.info.ai.show")}
            accessibilityState={{ expanded: open }}
            onPress={() => setOpen((v) => !v)}
            style={{ alignSelf: "flex-start", minHeight: 44, justifyContent: "center" }}
          >
            <Badge tone="accent">{t("video.info.ai.badge")}</Badge>
          </Pressable>
          {open && (
            <View style={{ gap: 2, padding: space.md, borderRadius: 12, backgroundColor: theme.surface2 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: space.xs }}>
                <Sparkles size={14} color={theme.accent} />
                <Txt variant="label">{t("video.info.ai.madeWith")}</Txt>
              </View>
              <Txt variant="caption" tone="secondary">{`${t("video.info.ai.run")} · ${shortRunId(credit.runId)}`}</Txt>
              {credit.model ? <Txt variant="caption" tone="secondary">{`${t("video.info.ai.model")} · ${credit.model}`}</Txt> : null}
              {credit.hardware ? <Txt variant="caption" tone="secondary">{`${t("video.info.ai.hardware")} · ${credit.hardware}`}</Txt> : null}
            </View>
          )}
        </View>
      )}
    </View>
  );
}
