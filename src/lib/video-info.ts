/** What a video is, read from the file — the same facts, rules and thresholds as the web watch page (lib/video-quality.ts there). */

export interface AiProvenance {
  generator: "orazaka";
  runId: string;
  model?: string | null;
  hardware?: string | null;
}

export interface AiCredit {
  runId: string;
  model: string | null;
  hardware: string | null;
}

const KNOWN: [string, number][] = [["16:9", 16 / 9], ["9:16", 9 / 16], ["1:1", 1], ["4:5", 4 / 5], ["5:4", 5 / 4], ["4:3", 4 / 3], ["3:4", 3 / 4], ["21:9", 21 / 9]];

/** `16:9`, `9:16`, `1:1`…: the picture's shape, named (the nearest common ratio), or its reduced size. */
export function aspectLabel(width?: number | null, height?: number | null): string | null {
  if (!width || !height || width <= 0 || height <= 0) return null;
  const r = width / height;
  const best = KNOWN.reduce((a, b) => (Math.abs(b[1] - r) < Math.abs(a[1] - r) ? b : a));
  return Math.abs(best[1] - r) / r < 0.04 ? best[0] : `${width}:${height}`;
}

/** Thresholds on the short side, with the slack of one multiple of 16 for encoders that round down (the web's table). */
const FHD = 1072;
const QHD = 1424;
const UHD = 2144;

/** `Full HD 1080p`, `QHD 1440p`, `4K` — only what is really above HD; below 1080p there is no label (720p is never sold as HD). */
export function qualityLabel(width?: number | null, height?: number | null): string | null {
  if (!width || !height || width <= 0 || height <= 0) return null;
  const side = Math.min(width, height);
  if (side >= UHD) return "4K";
  if (side >= QHD) return "QHD 1440p";
  if (side >= FHD) return "Full HD 1080p";
  return null;
}

export const clock = (seconds: number): string => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;

/** `6351addc-…` → `6351addc…`: the first group of the id, the rest elided. */
export function shortRunId(runId: string): string {
  const head = runId.split("-")[0] ?? runId;
  return head.length < runId.length ? `${head}…` : head;
}

const LINE = /Made with Orazaka[^\n]*/;

/** The credit of a video: the stored provenance first, the description's « Made with Orazaka » line for older videos. */
export function aiCreditOf(video: { aiProvenance?: AiProvenance | null; description?: string | null }): AiCredit | null {
  const p = video.aiProvenance;
  if (p?.runId) return { runId: p.runId, model: p.model ?? null, hardware: p.hardware ?? null };
  const line = video.description?.match(LINE)?.[0];
  if (!line) return null;
  const runId = line.match(/run\s+([0-9a-f]{6,}(?:-[0-9a-f]+)*)/i)?.[1];
  if (!runId) return null;
  const inner = line.match(/\(([^)]*)\)/)?.[1] ?? null;
  const [model, hardware] = inner ? inner.split(/\s+on\s+/i).map((s) => s.trim()) : [null, null];
  return { runId, model: model || null, hardware: hardware || null };
}

/** The description without its credit line (the badge carries it). */
export function withoutCredit(description?: string | null): string {
  return (description ?? "").replace(LINE, "").trim();
}
