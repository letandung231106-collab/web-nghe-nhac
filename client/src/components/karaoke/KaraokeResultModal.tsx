import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Sparkles, Flame, CheckCircle, RotateCcw, X, Share2, Award } from 'lucide-react';
import { KaraokeScoreSummary, KaraokeRank } from '../../hooks/useKaraokeScorer.js';
import { Button } from '../common/Button.js';

interface KaraokeResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  summary: KaraokeScoreSummary | null;
  onRestart: () => void;
  onShareToJam?: () => void;
  isInJam?: boolean;
}

const RANK_BADGES: Record<KaraokeRank, { title: string; color: string; desc: string }> = {
  SSS: {
    title: 'HẠNG SSS',
    color: 'from-amber-300 via-yellow-400 to-amber-500 text-black shadow-[0_0_50px_rgba(251,191,36,0.8)]',
    desc: '🌟 Đỉnh cao thanh nhạc! Giọng hát chuẩn xác tuyệt đối như ca sĩ chuyên nghiệp!',
  },
  SS: {
    title: 'HẠNG SS',
    color: 'from-amber-200 via-amber-400 to-yellow-500 text-black shadow-[0_0_40px_rgba(251,191,36,0.6)]',
    desc: '✨ Giọng hát xuất sắc! Bạn bắt nhịp và cao độ cực kỳ điêu luyện!',
  },
  S: {
    title: 'HẠNG S',
    color: 'from-emerald-300 via-teal-400 to-cyan-400 text-black shadow-[0_0_35px_rgba(52,211,153,0.6)]',
    desc: '🎉 Rất tuyệt vời! Giọng hát giàu nhạc cảm và vào nhịp rất chuẩn!',
  },
  A: {
    title: 'HẠNG A',
    color: 'from-cyan-300 via-sky-400 to-blue-500 text-black shadow-[0_0_30px_rgba(56,189,248,0.5)]',
    desc: '👏 Khá lắm! Chỉ cần chú ý thêm một vài nốt luyến là hoàn hảo!',
  },
  B: {
    title: 'HẠNG B',
    color: 'from-indigo-400 to-purple-500 text-white shadow-[0_0_25px_rgba(129,140,248,0.4)]',
    desc: '🎵 Đạt yêu cầu! Tiếp tục luyện tập để chinh phục các nốt cao nhé!',
  },
  C: {
    title: 'HẠNG C',
    color: 'from-neutral-500 to-neutral-700 text-white',
    desc: '🎤 Đừng nản lòng! Hãy bật nhạc và tự tin cất giọng thêm lần nữa!',
  },
};

export const KaraokeResultModal: React.FC<KaraokeResultModalProps> = ({
  isOpen,
  onClose,
  summary,
  onRestart,
  onShareToJam,
  isInJam,
}) => {
  if (!isOpen || !summary) return null;

  const rankInfo = RANK_BADGES[summary.rank] || RANK_BADGES.C;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-md"
        />

        {/* Modal Card */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.8, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative z-10 w-full max-w-md bg-gradient-to-b from-[#181a24] to-[#0c0d13] border border-white/15 rounded-3xl p-6 sm:p-8 text-center shadow-2xl overflow-hidden"
        >
          {/* Confetti Glow Background */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-amber-400/15 rounded-full blur-3xl pointer-events-none" />

          <button
            onClick={onClose}
            aria-label="Đóng"
            className="absolute top-4 right-4 p-2 rounded-full bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="flex items-center justify-center gap-2 mb-2 text-amber-300 font-bold uppercase tracking-wider text-xs">
            <Trophy className="w-4 h-4" />
            <span>Kết quả Hát Karaoke</span>
          </div>

          <h2 className="text-2xl font-black text-white mb-6">Tổng Kết Điểm Số</h2>

          {/* Big Rank Badge */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: [0, 1.2, 1] }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="my-4 inline-block relative"
          >
            <div
              className={`w-28 h-28 mx-auto rounded-3xl bg-gradient-to-br ${rankInfo.color} flex flex-col items-center justify-center font-black`}
            >
              <Sparkles className="w-6 h-6 mb-1 opacity-80" />
              <span className="text-3xl leading-none">{summary.rank}</span>
              <span className="text-[10px] tracking-widest mt-1 uppercase font-bold opacity-80">
                {rankInfo.title}
              </span>
            </div>
          </motion.div>

          <p className="text-xs text-white/80 max-w-xs mx-auto mb-6 italic">
            {rankInfo.desc}
          </p>

          {/* Score Box */}
          <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-4 mb-6">
            <div className="text-[11px] uppercase font-bold text-text-muted mb-1">Tổng điểm đạt được</div>
            <div className="text-4xl font-black font-mono tracking-tight text-white">
              {summary.totalScore.toLocaleString()}
            </div>
          </div>

          {/* Statistics Grid */}
          <div className="grid grid-cols-4 gap-2 mb-6">
            <div className="rounded-xl bg-white/[0.03] border border-white/5 p-2.5">
              <span className="block text-[10px] uppercase font-bold text-amber-300">Perfect</span>
              <span className="text-lg font-black font-mono text-white">{summary.perfectCount}</span>
            </div>
            <div className="rounded-xl bg-white/[0.03] border border-white/5 p-2.5">
              <span className="block text-[10px] uppercase font-bold text-emerald-300">Good</span>
              <span className="text-lg font-black font-mono text-white">{summary.goodCount}</span>
            </div>
            <div className="rounded-xl bg-white/[0.03] border border-white/5 p-2.5">
              <span className="block text-[10px] uppercase font-bold text-neutral-400">Miss</span>
              <span className="text-lg font-black font-mono text-white">{summary.missCount}</span>
            </div>
            <div className="rounded-xl bg-white/[0.03] border border-white/5 p-2.5">
              <span className="block text-[10px] uppercase font-bold text-rose-300 flex items-center justify-center gap-0.5">
                <Flame className="w-3 h-3 fill-current" /> Combo
              </span>
              <span className="text-lg font-black font-mono text-white">{summary.maxCombo}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2">
            {isInJam && onShareToJam && (
              <Button
                variant="primary"
                onClick={onShareToJam}
                leftIcon={<Share2 className="w-4 h-4" />}
                className="w-full bg-emerald-400 hover:bg-emerald-300 text-black font-bold"
              >
                Gửi điểm lên Bảng xếp hạng Jam
              </Button>
            )}

            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={onRestart}
                leftIcon={<RotateCcw className="w-4 h-4" />}
                className="flex-1"
              >
                Hát lại bài này
              </Button>
              <Button
                variant="ghost"
                onClick={onClose}
                className="flex-1 border border-white/10"
              >
                Đóng
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

