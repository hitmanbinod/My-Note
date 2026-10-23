/**
 * Waveform peaks for voice memos: 48 values (0-100) normalized with a gentle
 * curve. Computed at record time and stored on the node; for old memos without
 * `peaks` they are derived lazily into an in-memory cache and never written
 * back (saving would bump updatedAt and reorder the note list).
 */
const BAR_COUNT = 48;

/** Deterministic fallback bars when no peaks are stored and decoding fails. */
export const FALLBACK_PEAKS: number[] = Array.from({ length: BAR_COUNT }, (_, i) =>
  Math.round(14 + 20 * Math.abs(Math.sin(i * 0.55)) + 8 * Math.abs(Math.cos(i * 1.3)))
);

export const VOICE_MEMO_BARS = BAR_COUNT;

const peaksCache = new Map<string, number[]>();

async function decodePeaks(dataUrl: string): Promise<number[]> {
  const buffer = await (await fetch(dataUrl)).arrayBuffer();
  const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new Ctx();
  const audio = await ctx.decodeAudioData(buffer);
  const channel = audio.getChannelData(0);
  const block = Math.max(1, Math.floor(channel.length / BAR_COUNT));
  const peaks: number[] = [];
  for (let i = 0; i < BAR_COUNT; i++) {
    let max = 0;
    const start = i * block;
    for (let j = start; j < Math.min(start + block, channel.length); j += 16) {
      const v = Math.abs(channel[j]!);
      if (v > max) max = v;
    }
    peaks.push(Math.round(Math.pow(max, 0.6) * 100));
  }
  void ctx.close();
  return peaks;
}

export async function computePeaks(dataUrl: string): Promise<number[]> {
  const cached = peaksCache.get(dataUrl);
  if (cached) return cached;
  try {
    const peaks = await decodePeaks(dataUrl);
    peaksCache.set(dataUrl, peaks);
    return peaks;
  } catch {
    return FALLBACK_PEAKS;
  }
}

export async function computePeaksFromBlob(blob: Blob): Promise<number[]> {
  const dataUrl = await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(blob);
  });
  return computePeaks(dataUrl);
}
