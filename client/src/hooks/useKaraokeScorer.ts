import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  DetectedPitch,
  detectPitchFromBuffer,
  generateMelodyForLines,
  LineMelody,
  pitchDistanceInSemitones,
  TargetMelodyNote,
} from '../utils/pitchDetector.js';

export type KaraokeVerdictType = 'PERFECT' | 'GOOD' | 'MISS';

export interface KaraokeVerdict {
  type: KaraokeVerdictType;
  points: number;
  combo: number;
  lineIndex: number;
  timestamp: number;
}

export type KaraokeRank = 'SSS' | 'SS' | 'S' | 'A' | 'B' | 'C';

export interface KaraokeScoreSummary {
  songId: string;
  totalScore: number;
  rank: KaraokeRank;
  perfectCount: number;
  goodCount: number;
  missCount: number;
  maxCombo: number;
  completedAt: Date;
}

interface UseKaraokeScorerProps {
  songId?: string;
  lines: { time: number; text: string }[];
  currentTime: number;
  isPlaying: boolean;
  duration?: number;
  onVerdict?: (verdict: KaraokeVerdict) => void;
  onFinish?: (summary: KaraokeScoreSummary) => void;
}

export const calculateRank = (score: number, maxPossibleScore: number): KaraokeRank => {
  if (maxPossibleScore <= 0) return 'C';
  const ratio = score / maxPossibleScore;
  if (ratio >= 0.9) return 'SSS';
  if (ratio >= 0.8) return 'SS';
  if (ratio >= 0.7) return 'S';
  if (ratio >= 0.55) return 'A';
  if (ratio >= 0.4) return 'B';
  return 'C';
};

export const useKaraokeScorer = ({
  songId,
  lines,
  currentTime,
  isPlaying,
  duration = 240,
  onVerdict,
  onFinish,
}: UseKaraokeScorerProps) => {
  const [isMicOn, setIsMicOn] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [livePitch, setLivePitch] = useState<DetectedPitch | null>(null);
  const [currentNote, setCurrentNote] = useState<TargetMelodyNote | null>(null);
  const [lastVerdict, setLastVerdict] = useState<KaraokeVerdict | null>(null);
  const [totalScore, setTotalScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [perfectCount, setPerfectCount] = useState(0);
  const [goodCount, setGoodCount] = useState(0);
  const [missCount, setMissCount] = useState(0);
  const [isFinished, setIsFinished] = useState(false);

  // Sinh danh sách nốt giai điệu mục tiêu cho bài hát
  const lineMelodies = useMemo<LineMelody[]>(() => {
    if (!songId || lines.length === 0) return [];
    return generateMelodyForLines(songId, lines, duration);
  }, [songId, lines, duration]);

  // Audio Context & Stream refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number>(0);

  // Thống kê từng dòng đang hát
  const currentLineIndexRef = useRef<number>(-1);
  const lineStatsRef = useRef<{
    voicedFrames: number;
    hitFrames: number;
    perfectFrames: number;
  }>({ voicedFrames: 0, hitFrames: 0, perfectFrames: 0 });

  // Khởi động microphone và Web Audio API
  const startMic = useCallback(async () => {
    try {
      setMicError(null);
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Trình duyệt không hỗ trợ thu âm từ micro.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048; // Đủ mẫu cho phân tích tần số giọng người
      source.connect(analyser);

      audioContextRef.current = ctx;
      mediaStreamRef.current = stream;
      analyserRef.current = analyser;
      setIsMicOn(true);
    } catch (err: any) {
      console.error('Lỗi truy cập micro:', err);
      const msg =
        err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError'
          ? 'Bạn đã từ chối cấp quyền truy cập micro. Vui lòng cho phép quyền trong trình duyệt.'
          : err.message || 'Không thể kết nối với micro.';
      setMicError(msg);
      setIsMicOn(false);
    }
  }, []);

  // Tắt microphone và giải phóng AudioContext
  const stopMic = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    setIsMicOn(false);
    setLivePitch(null);
    setCurrentNote(null);
  }, []);

  // Reset điểm số
  const resetScore = useCallback(() => {
    setTotalScore(0);
    setCombo(0);
    setMaxCombo(0);
    setPerfectCount(0);
    setGoodCount(0);
    setMissCount(0);
    setLastVerdict(null);
    setIsFinished(false);
    currentLineIndexRef.current = -1;
    lineStatsRef.current = { voicedFrames: 0, hitFrames: 0, perfectFrames: 0 };
  }, []);

  // Đánh giá và chấm điểm cho dòng vừa hoàn thành
  const evaluateLine = useCallback(
    (lineIdx: number) => {
      if (lineIdx < 0 || lineIdx >= lineMelodies.length) return;
      const stats = lineStatsRef.current;
      const { voicedFrames, hitFrames, perfectFrames } = stats;

      let verdictType: KaraokeVerdictType = 'MISS';
      let points = 0;

      // Cần có ít nhất một số frame có giọng hát
      if (voicedFrames >= 8) {
        const hitRatio = hitFrames / voicedFrames;
        const perfectRatio = perfectFrames / voicedFrames;

        if (perfectRatio >= 0.5 || hitRatio >= 0.65) {
          verdictType = 'PERFECT';
        } else if (hitRatio >= 0.3) {
          verdictType = 'GOOD';
        }
      }

      setCombo((prevCombo) => {
        let nextCombo = 0;
        if (verdictType === 'PERFECT') {
          nextCombo = prevCombo + 1;
          const comboMultiplier = Math.min(2.0, 1 + nextCombo * 0.1);
          points = Math.round(1000 * comboMultiplier);
          setPerfectCount((c) => c + 1);
        } else if (verdictType === 'GOOD') {
          nextCombo = prevCombo + 1;
          points = 600;
          setGoodCount((c) => c + 1);
        } else {
          nextCombo = 0;
          points = 0;
          setMissCount((c) => c + 1);
        }

        setMaxCombo((m) => Math.max(m, nextCombo));
        setTotalScore((s) => s + points);

        const verdict: KaraokeVerdict = {
          type: verdictType,
          points,
          combo: nextCombo,
          lineIndex: lineIdx,
          timestamp: Date.now(),
        };
        setLastVerdict(verdict);
        if (onVerdict) onVerdict(verdict);

        return nextCombo;
      });

      // Reset thống kê cho dòng tiếp theo
      lineStatsRef.current = { voicedFrames: 0, hitFrames: 0, perfectFrames: 0 };
    },
    [lineMelodies, onVerdict]
  );

  // Vòng lặp phân tích Pitch qua Web Audio API (60fps)
  useEffect(() => {
    if (!isMicOn || !analyserRef.current || !audioContextRef.current) return;

    const analyser = analyserRef.current;
    const sampleRate = audioContextRef.current.sampleRate;
    const buffer = new Float32Array(analyser.fftSize);

    const tick = () => {
      if (analyser.getFloatTimeDomainData) {
        analyser.getFloatTimeDomainData(buffer);
      } else {
        const byteBuffer = new Uint8Array(analyser.fftSize);
        analyser.getByteTimeDomainData(byteBuffer);
        for (let i = 0; i < byteBuffer.length; i++) {
          buffer[i] = (byteBuffer[i] - 128) / 128;
        }
      }
      const pitch = detectPitchFromBuffer(buffer, sampleRate);
      setLivePitch(pitch);

      // Tìm nốt mục tiêu tại thời điểm hiện tại
      let target: TargetMelodyNote | null = null;
      let activeLineIdx = -1;

      for (let i = 0; i < lineMelodies.length; i++) {
        const line = lineMelodies[i];
        if (currentTime >= line.startSec && currentTime < line.endSec) {
          activeLineIdx = i;
          target =
            line.notes.find(
              (n) =>
                currentTime >= n.startSec &&
                currentTime < n.startSec + n.durationSec
            ) || line.notes[0];
          break;
        }
      }

      setCurrentNote(target);

      // Nếu chuyển từ dòng này sang dòng khác -> chấm điểm dòng trước
      if (
        currentLineIndexRef.current !== -1 &&
        currentLineIndexRef.current !== activeLineIdx &&
        activeLineIdx !== -1
      ) {
        evaluateLine(currentLineIndexRef.current);
      }
      currentLineIndexRef.current = activeLineIdx;

      // Nếu người dùng đang hát và có nốt mục tiêu -> thu thập frame thống kê
      if (activeLineIdx !== -1 && pitch?.isVoiced && target) {
        lineStatsRef.current.voicedFrames++;
        const diff = pitchDistanceInSemitones(pitch.midi, target.midi);

        if (diff <= 0.6) {
          lineStatsRef.current.perfectFrames++;
          lineStatsRef.current.hitFrames++;
        } else if (diff <= 1.4) {
          lineStatsRef.current.hitFrames++;
        }
      }

      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isMicOn, currentTime, lineMelodies, evaluateLine]);

  // Khi bài hát gần kết thúc (hoặc kết thúc), tổng kết kết quả
  const finishSession = useCallback(() => {
    if (isFinished) return;
    if (currentLineIndexRef.current !== -1) {
      evaluateLine(currentLineIndexRef.current);
    }

    const maxScore = Math.max(1000, lineMelodies.length * 1000);
    const rank = calculateRank(totalScore, maxScore);

    const summary: KaraokeScoreSummary = {
      songId: songId || '',
      totalScore,
      rank,
      perfectCount,
      goodCount,
      missCount,
      maxCombo,
      completedAt: new Date(),
    };

    setIsFinished(true);
    if (onFinish) onFinish(summary);
  }, [
    isFinished,
    lineMelodies.length,
    totalScore,
    songId,
    perfectCount,
    goodCount,
    missCount,
    maxCombo,
    evaluateLine,
    onFinish,
  ]);

  // Tự động finish khi bài hát phát xong
  useEffect(() => {
    if (
      isMicOn &&
      duration > 0 &&
      currentTime >= duration - 1.5 &&
      !isFinished &&
      totalScore > 0
    ) {
      finishSession();
    }
  }, [isMicOn, currentTime, duration, isFinished, totalScore, finishSession]);

  // Dọn dẹp tài nguyên khi unmount
  useEffect(() => {
    return () => {
      stopMic();
    };
  }, [stopMic]);

  const maxPossibleScore = Math.max(1000, lineMelodies.length * 1000);
  const currentRank = calculateRank(totalScore, maxPossibleScore);

  return {
    isMicOn,
    micError,
    startMic,
    stopMic,
    resetScore,
    livePitch,
    currentNote,
    lastVerdict,
    totalScore,
    combo,
    maxCombo,
    perfectCount,
    goodCount,
    missCount,
    currentRank,
    isFinished,
    finishSession,
    lineMelodies,
  };
};
