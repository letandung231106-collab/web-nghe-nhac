import React, { useState } from 'react';
import { Trophy, Mic, Sparkles, RotateCcw, Flame } from 'lucide-react';
import { useJamStore } from '../../store/jamStore.js';
import { usePlayerStore } from '../../store/playerStore.js';
import { Button } from '../common/Button.js';

const avatarOf = (u?: { username: string; avatarUrl: string | null } | null) =>
  u?.avatarUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(u?.username || '?')}`;

const MEDAL_ICONS = ['🥇', '🥈', '🥉'];

const RANK_BADGE_STYLE: Record<string, string> = {
  SSS: 'bg-amber-400 text-black font-black',
  SS:  'bg-amber-300 text-black font-black',
  S:   'bg-emerald-400 text-black font-bold',
  A:   'bg-cyan-400 text-black font-bold',
  B:   'bg-indigo-400 text-white font-bold',
  C:   'bg-neutral-600 text-white font-bold',
};

export const JamKaraokeLeaderboard: React.FC = () => {
  const isHost = useJamStore((s) => s.isHost);
  const roomSong = useJamStore((s) => s.roomSong);
  const karaokeLeaderboard = useJamStore((s) => s.karaokeLeaderboard);
  const resetKaraokeScores = useJamStore((s) => s.resetKaraokeScores);
  const toggleLyrics = usePlayerStore((s) => s.toggleLyrics);
  const isLyricsOpen = usePlayerStore((s) => s.isLyricsOpen);

  const [busy, setBusy] = useState(false);

  const handleReset = async () => {
    if (!confirm('Bạn có chắc muốn làm mới bảng điểm Karaoke cho phòng không?')) return;
    setBusy(true);
    try {
      await resetKaraokeScores();
    } finally {
      setBusy(false);
    }
  };

  const handleOpenKaraoke = () => {
    if (!isLyricsOpen) {
      toggleLyrics();
    }
  };

  return (
    <div className="rounded-2xl border border-cyan-400/25 bg-gradient-to-br from-cyan-500/10 via-emerald-500/5 to-transparent p-5 space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-cyan-300" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            Bảng xếp hạng Hát Karaoke
          </h3>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleOpenKaraoke}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-400 text-black text-xs font-bold hover:scale-105 active:scale-95 transition-all shadow-md shadow-emerald-500/20"
          >
            <Mic className="w-3.5 h-3.5" />
            <span>Hát bài này</span>
          </button>

          {isHost && karaokeLeaderboard.length > 0 && (
            <button
              onClick={handleReset}
              disabled={busy}
              title="Làm mới bảng xếp hạng"
              className="p-1.5 rounded-lg border border-white/10 hover:bg-white/10 text-text-muted hover:text-white transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      <p className="text-xs text-text-secondary">
        Bật micro, hát theo bài đang phát của phòng. App đo cao độ và chấm điểm thời gian thực.
      </p>

      {/* Leaderboard Entries */}
      {karaokeLeaderboard.length === 0 ? (
        <div className="rounded-xl bg-black/20 border border-white/5 p-6 text-center space-y-2">
          <Sparkles className="w-6 h-6 text-cyan-300/60 mx-auto" />
          <p className="text-xs text-text-muted">
            Chưa có ai thi hát bài này. Hãy là người đầu tiên cất giọng!
          </p>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleOpenKaraoke}
            leftIcon={<Mic className="w-3.5 h-3.5" />}
          >
            Mở màn hình Karaoke
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {karaokeLeaderboard.map((entry, idx) => {
            const medal = MEDAL_ICONS[idx];
            const badgeClass = RANK_BADGE_STYLE[entry.rank] || RANK_BADGE_STYLE.C;

            return (
              <div
                key={entry.userId}
                className={`flex items-center justify-between gap-3 p-3 rounded-xl border transition-all ${
                  idx === 0
                    ? 'bg-amber-400/10 border-amber-300/30 shadow-[0_0_15px_rgba(251,191,36,0.15)]'
                    : 'bg-white/[0.03] border-white/10'
                }`}
              >
                {/* Left: Rank & User */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-6 text-center font-bold font-mono text-sm">
                    {medal || `#${idx + 1}`}
                  </div>
                  <img
                    src={avatarOf(entry)}
                    alt=""
                    className="w-8 h-8 rounded-full bg-white/5 object-cover flex-shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate">{entry.username}</p>
                    <div className="flex items-center gap-2 text-[10px] text-text-muted">
                      <span>{entry.perfectCount} Perfect</span>
                      <span>·</span>
                      <span>{entry.goodCount} Good</span>
                      {entry.maxCombo > 0 && (
                        <>
                          <span>·</span>
                          <span className="text-rose-300 flex items-center gap-0.5">
                            <Flame className="w-2.5 h-2.5 fill-current" /> {entry.maxCombo} Combo
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Score & Rank Badge */}
                <div className="flex items-center gap-2.5 flex-shrink-0">
                  <div className="text-right">
                    <span className="text-sm font-black font-mono text-white">
                      {entry.totalScore.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-text-muted block">điểm</span>
                  </div>

                  <span className={`px-2 py-0.5 rounded-md text-[10px] uppercase ${badgeClass}`}>
                    {entry.rank}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

