import { z } from 'zod';

export interface TranslatedLine {
  time: number;
  text: string;
  translation: string;
}

export interface LyricExplanation {
  meaning: string;
  context: string;
  emotion: string;
}

const translationSchema = z.object({
  lines: z.array(
    z.object({
      time: z.number().optional(),
      text: z.string().optional(),
      translation: z.string(),
    })
  ),
});

const explanationSchema = z.object({
  meaning: z.string(),
  context: z.string(),
  emotion: z.string(),
});

// Cache explanations in memory for fast retrieval and saving tokens
const explanationCache = new Map<string, { data: LyricExplanation; expiresAt: number }>();
const CACHE_TTL_MS = 1000 * 60 * 60 * 24; // 24 hours

export class AILyricsService {
  /**
   * Helper to parse JSON or LRC synced lyrics string
   */
  public static parseSyncedLyrics(lyricsRaw?: string | null): Array<{ time: number; text: string }> {
    if (!lyricsRaw) return [];

    try {
      const parsed = JSON.parse(lyricsRaw);
      if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0].time === 'number') {
        return parsed.sort((a, b) => a.time - b.time);
      }
    } catch {
      // Continue to LRC format
    }

    const lines = lyricsRaw.split('\n');
    const result: Array<{ time: number; text: string }> = [];
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
  }

  private static getGeminiConfig() {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      throw new Error('Chưa cấu hình GEMINI_API_KEY trên máy chủ. Vui lòng kiểm tra file cấu hình .env.');
    }
    const model = process.env.GEMINI_MODEL?.trim() || 'gemini-flash-lite-latest'; // gemini-1.5-flash was retired (HTTP 404); lite answers in ~1s
    return { apiKey, model };
  }

  /** POSTs to Gemini; on overload/retired model retries once, then tries lighter flash models. */
  private static async callGemini(model: string, apiKey: string, body: string, timeoutMs: number) {
    // A hung model counts like an overloaded one (504) so the next model gets a turn.
    const call = (m: string, ms: number) =>
      fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(m)}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        signal: AbortSignal.timeout(ms),
        body,
      }).catch(() => new Response(null, { status: 504 }));
    const retryable = (s: number) => [404, 429, 500, 503, 504].includes(s);
    let response = await call(model, timeoutMs);
    if ([429, 503].includes(response.status)) {
      await new Promise((r) => setTimeout(r, 1200));
      response = await call(model, timeoutMs);
    }
    for (const m of ['gemini-flash-lite-latest', 'gemini-flash-latest']) {
      if (!retryable(response.status) || m === model) continue;
      response = await call(m, timeoutMs);
    }
    if (response.status === 504) throw new Error('AI phản hồi quá lâu. Vui lòng thử lại sau.');
    return response;
  }

  /**
   * Translate synced lyrics into Vietnamese while preserving timing.
   */
  public static async translateSyncedLyrics(
    songTitle: string,
    artistName: string,
    lines: Array<{ time: number; text: string }>
  ): Promise<TranslatedLine[]> {
    if (!lines || lines.length === 0) {
      return [];
    }

    const { apiKey, model } = this.getGeminiConfig();

    const systemInstruction = `You are an expert bilingual music lyricist and literary translator specializing in song translations to Vietnamese.
Your task is to translate time-synced song lyrics into natural, emotionally resonant, and poetic Vietnamese suitable for singing and subtitles.
RULES:
1. Translate each line accurately and poetically, preserving the emotional weight, metaphors, and rhythm.
2. For each line, return the exact original timestamp \`time\`, original \`text\`, and translated \`translation\` in Vietnamese.
3. If the original text is already in Vietnamese, refine it into standard, expressive Vietnamese or keep it if it is already natural.
4. Output strictly a JSON object: {"lines": [{"time": number, "text": string, "translation": string}]}.
5. Do not omit any lines and keep the exact array length and ordering.`;

    const userPrompt = `Song Title: "${songTitle}"
Artist: "${artistName}"
Lines to translate:
${JSON.stringify(lines.map((l, idx) => ({ index: idx, time: l.time, text: l.text })))}

Translate all lines into Vietnamese and return {"lines": [{"time": number, "text": string, "translation": string}]}.`;

    const response = await this.callGemini(model, apiKey, JSON.stringify({
        systemInstruction: { parts: [{ text: systemInstruction }] },
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 8192,
          responseMimeType: 'application/json',
        },
      }), 35000);

    if (!response.ok) {
      throw new Error(`Gemini API trả về lỗi HTTP ${response.status}. Vui lòng thử lại sau.`);
    }

    const data = (await response.json()) as any;
    const rawText = data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text || '').join('');
    if (!rawText) {
      throw new Error('Không nhận được phản hồi từ Gemini AI.');
    }

    let parsed: any;
    try {
      const cleanJson = rawText.replace(/```json|```/g, '').trim();
      parsed = JSON.parse(cleanJson);
    } catch {
      throw new Error('Dữ liệu dịch trả về từ AI không đúng định dạng JSON.');
    }

    const validated = translationSchema.parse(parsed);

    // Merge validated translation back with original timestamps to guarantee safety
    const result: TranslatedLine[] = lines.map((orig, i) => {
      const matched = validated.lines[i];
      return {
        time: orig.time,
        text: orig.text,
        translation: (matched?.translation || orig.text).trim(),
      };
    });

    return result;
  }

  /**
   * Explain meaning, context and emotions of a specific lyric line.
   */
  public static async explainLyricLine(
    songTitle: string,
    artistName: string,
    fullLyrics: string,
    targetLine: string,
    songId?: string
  ): Promise<LyricExplanation> {
    const trimmedLine = targetLine.trim();
    if (!trimmedLine) {
      throw new Error('Câu hát cần giải thích không được để trống.');
    }

    // Check cache
    const cacheKey = `${songId || songTitle}:${trimmedLine.toLowerCase()}`;
    const cached = explanationCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    const { apiKey, model } = this.getGeminiConfig();

    const systemInstruction = `Bạn là một nhà phê bình âm nhạc và chuyên gia phân tích ca từ tài hoa, am hiểu sâu sắc về nghệ thuật sáng tác và thi ca.
Nhiệm vụ của bạn là giải thích ý nghĩa, bối cảnh và cảm xúc của một câu hát cụ thể trong một bài hát.
QUY TẮC:
1. Ngôn ngữ trả lời hoàn toàn bằng tiếng Việt tinh tế, lôi cuốn, truyền cảm và sâu sắc.
2. Cấu trúc câu trả lời bắt buộc là JSON với đúng 3 trường:
   - "meaning": Giải thích chi tiết ý nghĩa ca từ của câu hát, các hình tượng ẩn dụ, nét chơi chữ hoặc hàm ý nghệ thuật.
   - "context": Bối cảnh của câu hát trong mạch truyện, câu chuyện tình yêu hay tâm trạng tổng thể của bài hát.
   - "emotion": Cảm xúc chủ đạo (da diết, hoài niệm, vụn vỡ, hy vọng, cô đơn...) và thông điệp mà tác giả/ca sĩ muốn truyền tải qua câu hát này.
3. Chỉ trả về đối tượng JSON hợp lệ, không bọc markdown.`;

    const contextLyrics = (fullLyrics || '').slice(0, 2500);
    const userPrompt = `Bài hát: "${songTitle}"
Nghệ sĩ thể hiện: "${artistName}"
Câu hát cần phân tích: "${trimmedLine}"

Ngữ cảnh các câu hát xung quanh / toàn bài:
${contextLyrics || '(Không có thêm ngữ cảnh)'}

Hãy giải thích ý nghĩa, bối cảnh và cảm xúc của câu hát "${trimmedLine}".`;

    const response = await this.callGemini(model, apiKey, JSON.stringify({
        systemInstruction: { parts: [{ text: systemInstruction }] },
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 2048,
          responseMimeType: 'application/json',
        },
      }), 25000);

    if (!response.ok) {
      throw new Error(`Gemini API trả về lỗi HTTP ${response.status}. Vui lòng thử lại sau.`);
    }

    const data = (await response.json()) as any;
    const rawText = data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text || '').join('');
    if (!rawText) {
      throw new Error('Không nhận được câu trả lời từ Gemini AI.');
    }

    let parsed: any;
    try {
      const cleanJson = rawText.replace(/```json|```/g, '').trim();
      parsed = JSON.parse(cleanJson);
    } catch {
      throw new Error('Dữ liệu phân tích trả về từ AI không đúng định dạng JSON.');
    }

    const validated = explanationSchema.parse(parsed);

    // Save to cache
    explanationCache.set(cacheKey, {
      data: validated,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });

    // Prune cache if it grows too large (> 500 entries)
    if (explanationCache.size > 500) {
      const now = Date.now();
      for (const [key, value] of explanationCache.entries()) {
        if (value.expiresAt <= now) {
          explanationCache.delete(key);
        }
      }
    }

    return validated;
  }
}
