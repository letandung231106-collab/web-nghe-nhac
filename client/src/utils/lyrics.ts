import { SyncedLyricLine } from '../types/index.js';

export const parseSyncedLyrics = (lyricsRaw?: string | null): SyncedLyricLine[] => {
  if (!lyricsRaw) return [];

  // Try parsing JSON format first
  try {
    const parsed = JSON.parse(lyricsRaw);
    if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0].time === 'number') {
      return parsed.sort((a, b) => a.time - b.time);
    }
  } catch (e) {
    // If not JSON, parse standard LRC format: [mm:ss.xx] Lyrics text
  }

  const lines = lyricsRaw.split('\n');
  const result: SyncedLyricLine[] = [];
  const lrcRegex = /\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\](.*)/;

  for (const line of lines) {
    const match = line.trim().match(lrcRegex);
    if (match) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const milliseconds = match[3] ? parseFloat(`0.${match[3]}`) : 0;
      const totalTime = minutes * 60 + seconds + milliseconds;
      const text = match[4].trim();
      if (text) {
        result.push({ time: totalTime, text });
      }
    }
  }

  return result.sort((a, b) => a.time - b.time);
};

/** Back to LRC text with every line moved by `shiftSec` (negative = earlier), clamped at 0. */
export const toShiftedLrc = (lines: SyncedLyricLine[], shiftSec: number) =>
  lines
    .map(({ time, text }) => {
      const t = Math.max(0, time + shiftSec);
      const m = Math.floor(t / 60);
      const s = t - m * 60;
      return `[${String(m).padStart(2, '0')}:${s.toFixed(2).padStart(5, '0')}] ${text}`;
    })
    .join('\n');


/**
 * Merges translated lines (JSON or array) into the synced lines
 */
export const mergeTranslatedLyrics = (
  lines: SyncedLyricLine[],
  translatedRaw?: string | null | SyncedLyricLine[]
): SyncedLyricLine[] => {
  if (!translatedRaw || lines.length === 0) return lines;

  let transArray: Array<{ time?: number; translation?: string; text?: string }> = [];

  if (Array.isArray(translatedRaw)) {
    transArray = translatedRaw;
  } else {
    try {
      const parsed = JSON.parse(translatedRaw);
      if (Array.isArray(parsed)) {
        transArray = parsed;
      }
    } catch {
      return lines;
    }
  }

  if (transArray.length === 0) return lines;

  return lines.map((line, idx) => {
    const match = transArray[idx] || transArray.find((t) => Math.abs((t.time ?? -999) - line.time) < 0.2);
    return {
      ...line,
      translation: match?.translation || line.translation,
    };
  });
};
