import test from 'node:test';
import assert from 'node:assert/strict';
import { alignLines } from '../services/lyricsWhisper.js';

const words = (text: string, start: number) =>
  text.split(' ').map((word, i) => ({ word, start: start + i * 0.4 }));

test('alignLines takes wording from the reference and timing from heard words', () => {
  const heard = [
    ...words('anh tim em giua', 12),
    ...words('dem dong', 14),          // misheard filler
    ...words('em o noi dau', 20.5),
    ...words('nguoi oi', 30),
  ];
  const lines = alignLines(['Anh tìm em giữa đêm đông', 'Em ở nơi đâu', 'Người ơi'], heard);
  assert.deepEqual(lines?.map((l) => l.time), [12, 20.5, 30]);
  assert.equal(lines?.[1].text, 'Em ở nơi đâu');
});

test('alignLines fills an unheard line between its neighbours and gives up when little matches', () => {
  const heard = [...words('mot hai ba', 10), ...words('bay tam chin', 20)];
  const lines = alignLines(['Một hai ba', 'Bốn năm sáu', 'Bảy tám chín'], heard);
  assert.deepEqual(lines?.map((l) => l.time), [10, 15, 20]);
  assert.equal(alignLines(['xyz abc', 'qqq www', 'rrr ttt'], heard), null);
});
