import test from 'node:test';
import assert from 'node:assert/strict';
import { AILyricsService } from '../services/aiLyricsService.js';

test('parseSyncedLyrics correctly parses JSON format', () => {
  const jsonLyrics = JSON.stringify([
    { time: 5, text: 'First line' },
    { time: 1.5, text: 'Intro' },
  ]);
  const parsed = AILyricsService.parseSyncedLyrics(jsonLyrics);
  assert.equal(parsed.length, 2);
  assert.equal(parsed[0].time, 1.5);
  assert.equal(parsed[0].text, 'Intro');
  assert.equal(parsed[1].time, 5);
});

test('parseSyncedLyrics correctly parses LRC format', () => {
  const lrc = `[00:01.50] Hello world\n[00:04.20] Second lyric line`;
  const parsed = AILyricsService.parseSyncedLyrics(lrc);
  assert.equal(parsed.length, 2);
  assert.equal(parsed[0].time, 1.5);
  assert.equal(parsed[0].text, 'Hello world');
  assert.equal(parsed[1].time, 4.2);
  assert.equal(parsed[1].text, 'Second lyric line');
});

test('AILyricsService throws when GEMINI_API_KEY is missing', async () => {
  const originalKey = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;
  try {
    await assert.rejects(
      AILyricsService.translateSyncedLyrics('Song', 'Artist', [{ time: 1, text: 'Hello' }]),
      /GEMINI_API_KEY/
    );
    await assert.rejects(
      AILyricsService.explainLyricLine('Song', 'Artist', 'Full lyrics', 'Hello'),
      /GEMINI_API_KEY/
    );
  } finally {
    if (originalKey !== undefined) process.env.GEMINI_API_KEY = originalKey;
  }
});

test('AILyricsService.translateSyncedLyrics calls Gemini with valid schema and preserves timing', async () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = 'test-gemini-key';

  const mockLines = [
    { time: 2.5, text: 'Yesterday all my troubles seemed so far away' },
    { time: 7.0, text: 'Now it looks as though they are here to stay' },
  ];

  try {
    globalThis.fetch = async (_url, init) => {
      assert.equal((init?.headers as Record<string, string>)['x-goog-api-key'], 'test-gemini-key');
      const mockResponse = {
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    lines: [
                      { time: 2.5, text: mockLines[0].text, translation: 'Ngày hôm qua mọi muộn phiền dường như còn xa lắm' },
                      { time: 7.0, text: mockLines[1].text, translation: 'Giờ đây chúng dường như đã ở lại đây mãi' },
                    ],
                  }),
                },
              ],
            },
          },
        ],
      };
      return new Response(JSON.stringify(mockResponse));
    };

    const translated = await AILyricsService.translateSyncedLyrics('Yesterday', 'The Beatles', mockLines);
    assert.equal(translated.length, 2);
    assert.equal(translated[0].time, 2.5);
    assert.equal(translated[0].translation, 'Ngày hôm qua mọi muộn phiền dường như còn xa lắm');
    assert.equal(translated[1].time, 7.0);
    assert.equal(translated[1].translation, 'Giờ đây chúng dường như đã ở lại đây mãi');
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey !== undefined) process.env.GEMINI_API_KEY = originalKey;
    else delete process.env.GEMINI_API_KEY;
  }
});

test('AILyricsService.explainLyricLine returns meaning, context, emotion and uses cache', async () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = 'test-gemini-key';

  let fetchCallCount = 0;

  try {
    globalThis.fetch = async () => {
      fetchCallCount++;
      return new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      meaning: 'Câu hát thể hiện sự tiếc nuối về một thời bình yên đã qua.',
                      context: 'Bài hát mở đầu bằng việc hồi tưởng về quá khứ tươi đẹp trước khi biến cố xảy đến.',
                      emotion: 'Cảm giác hoài niệm, ngậm ngùi và cô đơn.',
                    }),
                  },
                ],
              },
            },
          ],
        })
      );
    };

    const result1 = await AILyricsService.explainLyricLine(
      'Yesterday',
      'The Beatles',
      'Yesterday all my troubles seemed so far away...',
      'Yesterday all my troubles seemed so far away',
      'test-song-id'
    );

    assert.equal(fetchCallCount, 1);
    assert.equal(result1.meaning, 'Câu hát thể hiện sự tiếc nuối về một thời bình yên đã qua.');
    assert.equal(result1.emotion, 'Cảm giác hoài niệm, ngậm ngùi và cô đơn.');

    // Second call for the same line and song should be served from memory cache!
    const result2 = await AILyricsService.explainLyricLine(
      'Yesterday',
      'The Beatles',
      'Yesterday all my troubles seemed so far away...',
      'Yesterday all my troubles seemed so far away',
      'test-song-id'
    );

    assert.equal(fetchCallCount, 1); // Should NOT increment
    assert.deepEqual(result1, result2);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey !== undefined) process.env.GEMINI_API_KEY = originalKey;
    else delete process.env.GEMINI_API_KEY;
  }
});
