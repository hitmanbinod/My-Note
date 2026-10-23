import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import { FALLBACK_PEAKS, VOICE_MEMO_BARS as BAR_COUNT, computePeaks } from '@/lib/editor/voice-peaks';
import { useEffect, useMemo, useRef, useState } from 'react';

const fmt = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;

/** Only one memo plays at a time — pause the previous when a new one starts. */
let currentAudio: HTMLAudioElement | null = null;
function pauseOthers(audio: HTMLAudioElement) {
  if (currentAudio && currentAudio !== audio && !currentAudio.paused) currentAudio.pause();
  currentAudio = audio;
}

export function VoiceMemoView({ node, deleteNode, editor }: NodeViewProps) {
  const dataUrl = node.attrs.dataUrl as string | null;
  const storedDuration = Number(node.attrs.duration) || 0;
  const storedPeaks = Array.isArray(node.attrs.peaks) ? (node.attrs.peaks as number[]) : null;
  const transcript = (node.attrs.transcript as string | null) ?? null;
  const editable = editor?.isEditable ?? true;

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fillRef = useRef<HTMLDivElement>(null);
  const timeRef = useRef<HTMLSpanElement>(null);
  const waveRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef(0);
  const [peaks, setPeaks] = useState<number[]>(storedPeaks ?? FALLBACK_PEAKS);
  const [playing, setPlaying] = useState(false);
  const [copied, setCopied] = useState(false);

  // Real peaks for old memos — computed lazily, never saved back
  useEffect(() => {
    if (storedPeaks || !dataUrl) return;
    let cancelled = false;
    void computePeaks(dataUrl).then((p) => { if (!cancelled) setPeaks(p); });
    return () => { cancelled = true; };
  }, [storedPeaks, dataUrl]);

  const total = () => {
    const a = audioRef.current;
    const d = a && Number.isFinite(a.duration) && a.duration > 0 ? a.duration : storedDuration;
    return d || 0;
  };

  const paint = (p: number) => {
    const clamped = Math.max(0, Math.min(1, p));
    fillRef.current?.style.setProperty('--p', String(clamped));
    waveRef.current?.setAttribute('aria-valuenow', String(Math.round(clamped * 100)));
  };

  // Blob URL for reliable seeking; revoked on unmount
  useEffect(() => {
    if (!dataUrl) return undefined;
    let url: string | null = null;
    let objectUrl: string | null = null;
    let cancelled = false;
    void fetch(dataUrl)
      .then((r) => r.blob())
      .then((blob) => {
        if (cancelled) return;
        url = URL.createObjectURL(blob);
        objectUrl = url;
        if (audioRef.current) audioRef.current.src = url;
      })
      .catch(() => { /* keep dataUrl src */ });
    return () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.current);
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [dataUrl]);

  const startLoop = () => {
    cancelAnimationFrame(rafRef.current);
    const tick = () => {
      const a = audioRef.current;
      if (!a) return;
      const t = total();
      paint(t ? a.currentTime / t : 0);
      if (timeRef.current) timeRef.current.textContent = fmt(a.currentTime);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  };

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) {
      pauseOthers(a);
      void a.play();
    } else {
      a.pause();
    }
  };

  const seekTo = (ratio: number) => {
    const a = audioRef.current;
    if (!a) return;
    const t = total();
    if (!t) return;
    const clamped = Math.max(0, Math.min(1, ratio));
    a.currentTime = clamped * t;
    paint(clamped);
    if (timeRef.current) timeRef.current.textContent = fmt(a.currentTime);
  };

  const ratioFromEvent = (clientX: number) => {
    const rect = waveRef.current?.getBoundingClientRect();
    if (!rect || !rect.width) return 0;
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  };

  const onWavePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    const el = event.currentTarget;
    try { el.setPointerCapture(event.pointerId); } catch { /* inactive pointer */ }
    seekTo(ratioFromEvent(event.clientX));
    const move = (ev: PointerEvent) => seekTo(ratioFromEvent(ev.clientX));
    const up = () => {
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
    };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
  };

  const bars = useMemo(
    () => peaks.slice(0, BAR_COUNT).map((p) => Math.max(3, Math.min(22, Math.round((p / 100) * 22)))),
    [peaks]
  );

  const timeLabel = total() ? fmt(total()) : storedDuration ? fmt(storedDuration) : '0:00';

  return (
    <NodeViewWrapper className="voice-memo-node" data-node-type="voiceMemo">
      <div contentEditable={false} className={`vm-pill${playing ? ' is-playing' : ''}`}>
        <button type="button" className="vm-play" onClick={toggle} aria-label={playing ? 'Pause voice memo' : 'Play voice memo'}>
          <svg className="vm-icon-play" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13l11-6.5-11-6.5Z" /></svg>
          <svg className="vm-icon-pause" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6.5" y="6.5" width="11" height="11" rx="1.5" /></svg>
        </button>
        <div
          ref={waveRef}
          className="vm-wave"
          role="slider"
          tabIndex={0}
          aria-label="Voice memo position"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={0}
          onPointerDown={onWavePointerDown}
          onKeyDown={(event) => {
            if (event.key === 'ArrowLeft') { event.preventDefault(); seekTo(((audioRef.current?.currentTime ?? 0) - 5) / (total() || 1)); }
            else if (event.key === 'ArrowRight') { event.preventDefault(); seekTo(((audioRef.current?.currentTime ?? 0) + 5) / (total() || 1)); }
            else if (event.key === ' ' || event.key === 'Enter') { event.preventDefault(); toggle(); }
          }}
        >
          <div className="vm-wave__layer vm-wave__base">
            {bars.map((h, i) => <span key={i} className="vm-wave__bar" style={{ height: h }} />)}
          </div>
          <div ref={fillRef} className="vm-wave__layer vm-wave__fill" style={{ ['--p' as string]: 0 }}>
            {bars.map((h, i) => <span key={i} className="vm-wave__bar" style={{ height: h }} />)}
          </div>
        </div>
        <span ref={timeRef} className="vm-time">{timeLabel}</span>
        {editable && (
          <button
            type="button"
            className="vm-delete"
            aria-label="Delete voice memo"
            title="Delete voice memo"
            onClick={(event) => { event.stopPropagation(); deleteNode(); }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4.5 7h15M9 7V4.5h6V7m2.75 0-.6 11.05a2 2 0 0 1-2 1.9h-6.3a2 2 0 0 1-2-1.9L6.25 7" /></svg>
          </button>
        )}
      </div>
      {transcript && (
        <div contentEditable={false} className="vm-transcript">
          <span className="vm-transcript-text">{transcript}</span>
          <button
            type="button"
            className="vm-transcript-copy"
            onClick={() => {
              void navigator.clipboard.writeText(transcript).then(() => {
                setCopied(true);
                window.setTimeout(() => setCopied(false), 1500);
              });
            }}
          >
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      )}
      <audio
        ref={audioRef}
        src={dataUrl ?? undefined}
        preload="metadata"
        style={{ display: 'none' }}
        onPlay={() => { setPlaying(true); startLoop(); }}
        onPause={() => { setPlaying(false); cancelAnimationFrame(rafRef.current); }}
        onEnded={() => { setPlaying(false); cancelAnimationFrame(rafRef.current); paint(0); if (timeRef.current) timeRef.current.textContent = timeLabel; }}
      />
    </NodeViewWrapper>
  );
}
