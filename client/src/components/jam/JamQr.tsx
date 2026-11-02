import React, { useEffect, useRef, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import jsQR from 'jsqr';
import { X } from 'lucide-react';

/** Pulls a 6-char room code out of a scanned jam link (…/jam/K7M2QX) or a bare code. */
export const codeFromQr = (text: string): string | null => {
  const fromLink = text.match(/\/jam\/([A-Za-z0-9]{6})(?![A-Za-z0-9])/);
  if (fromLink) return fromLink[1].toUpperCase();
  const bare = text.trim().toUpperCase();
  return /^[A-Z0-9]{6}$/.test(bare) ? bare : null;
};

const Modal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({ title, onClose, children }) => (
  <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
    <div role="dialog" aria-label={title} className="w-full max-w-sm rounded-2xl border border-white/10 bg-neutral-900 p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">{title}</h2>
        <button onClick={onClose} aria-label="Đóng" className="rounded-lg p-1 text-text-muted hover:bg-white/10"><X className="w-5 h-5" /></button>
      </div>
      {children}
    </div>
  </div>
);

export const QrShareModal: React.FC<{ code: string; link: string; onClose: () => void }> = ({ code, link, onClose }) => (
  <Modal title="Quét để vào phòng" onClose={onClose}>
    <div className="mx-auto w-fit rounded-xl bg-white p-3">
      <QRCodeCanvas value={link} size={220} marginSize={1} />
    </div>
    <p className="text-center text-2xl font-mono font-black tracking-[0.3em] text-white">{code}</p>
    <p className="text-center text-xs text-text-muted">Bạn bè mở Nghe chung → "Quét mã QR", hoặc quét bằng camera điện thoại.</p>
  </Modal>
);

export const QrScanModal: React.FC<{ onCode: (code: string) => void; onClose: () => void }> = ({ onCode, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let stream: MediaStream | null = null;
    let frame = 0;
    let stopped = false;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    const tick = () => {
      if (stopped) return;
      const video = videoRef.current;
      if (video && ctx && video.readyState >= video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0);
        const result = jsQR(ctx.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height);
        const code = result && codeFromQr(result.data);
        if (code) return onCode(code);
        if (result) setError('Mã QR này không phải phòng nghe chung.');
      }
      frame = requestAnimationFrame(tick);
    };

    navigator.mediaDevices?.getUserMedia({ video: { facingMode: 'environment' } })
      .then((s) => {
        stream = s;
        if (stopped || !videoRef.current) return;
        videoRef.current.srcObject = s;
        videoRef.current.play().catch(() => {});
        tick();
      })
      .catch(() => setError('Không mở được camera. Hãy cấp quyền camera hoặc nhập mã thủ công.'));

    return () => {
      stopped = true;
      cancelAnimationFrame(frame);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return (
    <Modal title="Quét mã QR phòng" onClose={onClose}>
      <div className="relative aspect-square overflow-hidden rounded-xl bg-black">
        <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />
        <div className="pointer-events-none absolute inset-8 rounded-xl border-2 border-emerald-300/80" />
      </div>
      {error ? <p role="alert" className="text-sm text-rose-400">{error}</p> : <p className="text-xs text-text-muted text-center">Đưa mã QR vào khung để vào phòng.</p>}
    </Modal>
  );
};
