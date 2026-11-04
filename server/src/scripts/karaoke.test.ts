import test from 'node:test';
import assert from 'node:assert/strict';

// 1. Math Pitch & Note Conversion Tests
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const freqToMidi = (freq: number): number => 69 + 12 * Math.log2(freq / 440);
const midiToFreq = (midi: number): number => 440 * Math.pow(2, (midi - 69) / 12);
const midiToNoteName = (midi: number): string => {
  const rounded = Math.round(midi);
  const noteIndex = ((rounded % 12) + 12) % 12;
  const octave = Math.floor(rounded / 12) - 1;
  return `${NOTE_NAMES[noteIndex]}${octave}`;
};

const pitchDistanceInSemitones = (userMidi: number, targetMidi: number): number => {
  const diff = userMidi - targetMidi;
  const d0 = Math.abs(diff);
  const dMinus = Math.abs(diff - 12);
  const dPlus = Math.abs(diff + 12);
  return Math.min(d0, dMinus, dPlus);
};

const calculateRank = (score: number, maxPossibleScore: number) => {
  if (maxPossibleScore <= 0) return 'C';
  const ratio = score / maxPossibleScore;
  if (ratio >= 0.9) return 'SSS';
  if (ratio >= 0.8) return 'SS';
  if (ratio >= 0.7) return 'S';
  if (ratio >= 0.55) return 'A';
  if (ratio >= 0.4) return 'B';
  return 'C';
};

test('Pitch math accurately converts A4 (440Hz) and C4 (~261.63Hz)', () => {
  const a4Midi = freqToMidi(440);
  assert.equal(Math.round(a4Midi), 69);
  assert.equal(midiToNoteName(69), 'A4');
  assert.equal(Math.round(midiToFreq(69)), 440);

  const c4Freq = 261.625565;
  const c4Midi = freqToMidi(c4Freq);
  assert.equal(Math.round(c4Midi), 60);
  assert.equal(midiToNoteName(60), 'C4');
});

test('Octave Invariance allows male/female voices an octave apart to score Perfect', () => {
  // Nữ hát C5 (72), Nam hát C4 (60)
  const distSameNoteDiffOctave = pitchDistanceInSemitones(60, 72);
  assert.equal(distSameNoteDiffOctave, 0, 'Distance should be 0 semitones across one octave');

  // Hát lệch 1 bán âm (C#4 vs C4)
  const distHalfStep = pitchDistanceInSemitones(61, 60);
  assert.equal(distHalfStep, 1);
});

test('Karaoke rank calculations accurately bracket performances', () => {
  assert.equal(calculateRank(9500, 10000), 'SSS');
  assert.equal(calculateRank(8200, 10000), 'SS');
  assert.equal(calculateRank(7300, 10000), 'S');
  assert.equal(calculateRank(5800, 10000), 'A');
  assert.equal(calculateRank(4200, 10000), 'B');
  assert.equal(calculateRank(2000, 10000), 'C');
});

test('Leaderboard correctly sorts participants by highest total score', () => {
  const scores = [
    { username: 'Lê Quỳnh', totalScore: 9200, rank: 'SSS' },
    { username: 'Minh Tuấn', totalScore: 7800, rank: 'S' },
    { username: 'Hoàng Long', totalScore: 9850, rank: 'SSS' },
    { username: 'Thanh Thảo', totalScore: 6100, rank: 'A' },
  ];

  scores.sort((a, b) => b.totalScore - a.totalScore);

  assert.equal(scores[0].username, 'Hoàng Long');
  assert.equal(scores[0].totalScore, 9850);
  assert.equal(scores[1].username, 'Lê Quỳnh');
  assert.equal(scores[1].totalScore, 9200);
  assert.equal(scores[2].username, 'Minh Tuấn');
  assert.equal(scores[3].username, 'Thanh Thảo');
});

