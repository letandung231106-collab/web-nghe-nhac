import { normalize } from './lyricsLookup.js';

// Whisper (via Groq) transcribes speech with per-word timestamps, which time lines far more precisely than
// a general multimodal model. When the lyrics text is known, each line is anchored on the words Whisper heard,
// so the wording comes from the reference and only the timing from the audio.
const GROQ_URL = 'https://api.groq.com/openai/v1/audio/transcriptions';
const MAX_BYTES = 25 * 1024 * 1024;
const SEARCH_WINDOW = 120;

interface Word { word: string; start: number }
interface Segment { start: number; text: string }
export interface TimedLine { time: number; text: string }

export const whisperAvailable = () => !!process.env.GROQ_API_KEY?.trim();

export async function whisperTranscribe(data: Buffer, mimeType: string, language?: string) {
  if (data.length > MAX_BYTES) throw new Error('Tệp nhạc quá lớn cho Whisper (tối đa 25 MB).');
  const form = new FormData();
  form.append('file', new Blob([new Uint8Array(data)],{ type: mimeType }), 'audio.' + (mimeType.split('/')[1] || 'mp3'));
  form.append('model', process.env.GROQ_WHISPER_MODEL?.trim() || 'whisper-large-v3');
  form.append('response_format', 'verbose_json');
  form.append('timestamp_granularities[]', 'word');
  form.append('timestamp_granularities[]', 'segment');
  form.append('temperature', '0');
  if (language) form.append('language', language);
  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: { authorization: `Bearer ${process.env.GROQ_API_KEY!.trim()}` },
    body: form,
    signal: AbortSignal.timeout(120000),
  });
  if (!res.ok) throw new Error(`Whisper lỗi (HTTP ${res.status}): ${(await res.text()).slice(0, 200)}`);
  const json = await res.json() as { words?: Word[]; segments?: Segment[] };
  return { words: json.words || [], segments: json.segments || [] };
}

/** Times each reference line by finding its opening words in Whisper's word stream, in order. Null if too few match. */
export function alignLines(lines: string[], words: Word[]): TimedLine[] | null {
  const heard = words.map((w) => ({ token: normalize(w.word), start: w.start })).filter((w) => w.token);
  const times: (number | null)[] = [];
  let cursor = 0;
  for (const line of lines) {
    const tokens = normalize(line).split(' ').filter(Boolean).slice(0, 4);
    let best = -1;
    let bestScore = 0;
    for (let j = cursor; j < Math.min(heard.length, cursor + SEARCH_WINDOW); j++) {
      let score = 0;
      tokens.forEach((t, k) => { if (heard[j + k]?.token === t) score++; });
      // Prefer the earliest strong match; a later match must be clearly better to win.
      if (score > bestScore) { best = j; bestScore = score; }
      if (score === tokens.length) break;
    }
    const enough = tokens.length <= 1 ? bestScore === 1 : bestScore >= Math.min(2, tokens.length);
    if (best >= 0 && enough) {
      times.push(heard[best].start);
      cursor = best + 1;
    } else {
      times.push(null);
    }
  }
  const matched = times.filter((t) => t !== null).length;
  if (matched < Math.max(2, lines.length * 0.5)) return null;

  // Unmatched lines are spread evenly between their matched neighbours.
  for (let i = 0; i < times.length; i++) {
    if (times[i] !== null) continue;
    let k = i;
    while (k < times.length && times[k] === null) k++;
    const prev = i > 0 ? times[i - 1]! : Math.max(0, (times[k] ?? 0) - 3 * (k - i));
    const next = k < times.length ? times[k]! : prev + 3 * (k - i + 1);
    for (let n = i; n < k; n++) times[n] = prev + ((next - prev) * (n - i + 1)) / (k - i + 1);
    i = k - 1;
  }
  return lines.map((text, i) => ({ time: Math.round(times[i]! * 100) / 100, text }));
}

/** Whisper's own segments as lines, for songs with no reference lyrics. */
export const segmentLines = (segments: Segment[]): TimedLine[] =>
  segments.map((s) => ({ time: Math.round(s.start * 100) / 100, text: s.text.trim() })).filter((l) => l.text);
