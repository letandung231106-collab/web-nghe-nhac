/**
 * MusicWave Karaoke Audio Engine
 * Real-time Vocal Remover / Instrumental Beat Extractor using Web Audio API.
 * Uses Out-of-Phase Stereo (OOPS) cancellation with low-frequency bass preservation.
 * Runs 100% in-browser with zero latency.
 */

class KaraokeAudioEngine {
  private audioCtx: AudioContext | null = null;
  private sourceNode: MediaElementAudioSourceNode | null = null;
  private isBeatModeActive = false;
  private attachedElement: HTMLMediaElement | null = null;

  // Processing nodes
  private dryGain: GainNode | null = null;
  private vocalCutGain: GainNode | null = null;
  private bassGain: GainNode | null = null;
  private splitter: ChannelSplitterNode | null = null;
  private inverter: GainNode | null = null;
  private merger: ChannelMergerNode | null = null;
  private bassFilter: BiquadFilterNode | null = null;
  private vocalBandReject: BiquadFilterNode | null = null;
  private masterGain: GainNode | null = null;

  /**
   * Khởi tạo Web Audio graph cho việc tách lời (Vocal Removal)
   */
  public init(audioElement: HTMLMediaElement | null): boolean {
    if (!audioElement || typeof window === 'undefined') return false;
    if (this.attachedElement === audioElement && this.audioCtx) return true;

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return false;

      // Dùng chung hoặc tạo AudioContext mới
      this.audioCtx = this.audioCtx || new AudioCtx();
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(() => {});
      }

      this.attachedElement = audioElement;

      // Đảm bảo audio có thuộc tính crossOrigin nếu cần để Web Audio không bị tắt tiếng vì CORS
      if (!audioElement.crossOrigin && audioElement.src && !audioElement.src.startsWith('blob:') && !audioElement.src.startsWith('data:')) {
        try {
          const url = new URL(audioElement.src, window.location.href);
          if (url.origin !== window.location.origin) {
            const savedTime = audioElement.currentTime;
            const wasPlaying = !audioElement.paused;
            const currentSrc = audioElement.src;
            audioElement.crossOrigin = 'anonymous';
            audioElement.src = currentSrc;
            audioElement.currentTime = savedTime;
            if (wasPlaying) {
              audioElement.play().catch(() => {});
            }
          }
        } catch {}
      }

      // 1. Tạo Source Node từ thẻ Audio
      // Một thẻ audio chỉ được tạo createMediaElementSource một lần duy nhất
      if (!this.sourceNode) {
        this.sourceNode = this.audioCtx.createMediaElementSource(audioElement);
      }

      // 2. Nhánh DRY (Âm thanh gốc đầy đủ cả lời và beat)
      this.dryGain = this.audioCtx.createGain();
      this.dryGain.gain.value = 1.0;

      // 3. Nhánh VOCAL CUT (Tách giọng ca sĩ, chỉ giữ Beat)
      // Tách kênh Left và Right
      this.splitter = this.audioCtx.createChannelSplitter(2);
      this.inverter = this.audioCtx.createGain();
      this.inverter.gain.value = -1.0; // Đảo pha 180 độ kênh Right

      // Trộn Left + (-Right) = L - R (triệt tiêu tín hiệu trung tâm / vocal)
      this.merger = this.audioCtx.createChannelMerger(2);

      // Bộ lọc cắt dải tần số giọng hát chính (300Hz - 3400Hz)
      this.vocalBandReject = this.audioCtx.createBiquadFilter();
      this.vocalBandReject.type = 'peaking';
      this.vocalBandReject.frequency.value = 1200;
      this.vocalBandReject.Q.value = 0.8;
      this.vocalBandReject.gain.value = -18; // Giảm mạnh giọng hát

      // Bộ lọc bảo toàn âm trầm (Bass / Kick drum / 808 sub) dưới 200Hz không bị mất
      this.bassFilter = this.audioCtx.createBiquadFilter();
      this.bassFilter.type = 'lowpass';
      this.bassFilter.frequency.value = 220;
      this.bassFilter.Q.value = 1.0;

      this.bassGain = this.audioCtx.createGain();
      this.bassGain.gain.value = 1.2; // Bù âm lượng bass cho beat đầy đặn

      this.vocalCutGain = this.audioCtx.createGain();
      this.vocalCutGain.gain.value = 0.0; // Mặc định tắt beat mode

      this.masterGain = this.audioCtx.createGain();
      this.masterGain.gain.value = 1.0;

      // --- KẾT NỐI ĐỒ THỊ ÂM THANH (AUDIO GRAPH) ---
      // Nhánh gốc: Source -> dryGain -> masterGain
      this.sourceNode.connect(this.dryGain);
      this.dryGain.connect(this.masterGain);

      // Nhánh Vocal Cut:
      // Source -> splitter:
      // Channel 0 (L) -> merger (cả 2 kênh L và R)
      // Channel 1 (R) -> inverter (-1) -> merger
      this.sourceNode.connect(this.splitter);
      this.splitter.connect(this.merger, 0, 0); // L vào L
      this.splitter.connect(this.merger, 0, 1); // L vào R
      this.splitter.connect(this.inverter, 1);   // R vào Inverter
      this.inverter.connect(this.merger, 0, 0); // -R vào L
      this.inverter.connect(this.merger, 0, 1); // -R vào R

      // Tín hiệu đã triệt tiêu giọng hát -> bộ lọc giảm âm -> vocalCutGain -> masterGain
      this.merger.connect(this.vocalBandReject);
      this.vocalBandReject.connect(this.vocalCutGain);
      this.vocalCutGain.connect(this.masterGain);

      // Nhánh Bass: Source -> bassFilter -> bassGain -> vocalCutGain (chỉ phát khi bật beat mode)
      this.sourceNode.connect(this.bassFilter);
      this.bassFilter.connect(this.bassGain);
      this.bassGain.connect(this.vocalCutGain);

      // Master output ra loa
      this.masterGain.connect(this.audioCtx.destination);

      return true;
    } catch (err) {
      console.warn('[KaraokeAudioEngine] Web Audio setup warning:', err);
      return false;
    }
  }

  /**
   * Bật / Tắt chế độ "Chỉ cần Beat" (Tách giọng ca sĩ)
   */
  public setBeatOnly(enabled: boolean): void {
    this.isBeatModeActive = enabled;
    if (!this.audioCtx || !this.dryGain || !this.vocalCutGain) {
      // Nếu chưa khởi tạo thì thử tìm audio element
      const el = document.getElementById('musicwave-html5-audio') as HTMLMediaElement | null;
      if (el) this.init(el);
    }

    if (!this.audioCtx || !this.dryGain || !this.vocalCutGain) return;

    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }

    const now = this.audioCtx.currentTime;
    const fadeDuration = 0.15; // Chuyển đổi êm ái trong 150ms

    if (enabled) {
      // Giảm âm thanh gốc xuống 0, tăng nhánh Beat / Tách lời lên 1.4 (bù âm lượng)
      this.dryGain.gain.setTargetAtTime(0.0, now, fadeDuration);
      this.vocalCutGain.gain.setTargetAtTime(1.4, now, fadeDuration);
    } else {
      // Trả lại âm thanh gốc đầy đủ
      this.dryGain.gain.setTargetAtTime(1.0, now, fadeDuration);
      this.vocalCutGain.gain.setTargetAtTime(0.0, now, fadeDuration);
    }
  }

  public isBeatOnly(): boolean {
    return this.isBeatModeActive;
  }
}

export const karaokeAudioEngine = new KaraokeAudioEngine();

