import React, { useEffect, useRef, useState } from 'react';
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Lock,
  Maximize,
  Play,
  Video,
} from 'lucide-react';
import type { RecordedLecture } from '../types.ts';

interface ChemistryVideoPlayerProps {
  lecture: RecordedLecture;
  idToken?: string | null;
  isUnlocked: boolean;
  initialPositionSeconds?: number;
  isCompleted?: boolean;
  hasPrev?: boolean;
  hasNext?: boolean;
  onPrev?: () => void;
  onNext?: () => void;
  onProgressSave?: (completed: boolean, percent: number, positionSeconds: number, durationSeconds: number) => void;
  onUnlockClick?: () => void;
}

export function extractYouTubeEmbed(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes('youtu.be')) {
      const id = parsed.pathname.slice(1);
      return id ? `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1` : null;
    }
    if (parsed.hostname.includes('youtube.com')) {
      if (parsed.pathname.includes('/embed/')) return url;
      const v = parsed.searchParams.get('v');
      return v ? `https://www.youtube.com/embed/${v}?rel=0&modestbranding=1` : null;
    }
  } catch {
    return null;
  }
  return null;
}

export function ChemistryVideoPlayer({
  lecture,
  idToken,
  isUnlocked,
  initialPositionSeconds = 0,
  isCompleted = false,
  hasPrev = false,
  hasNext = false,
  onPrev,
  onNext,
  onProgressSave,
  onUnlockClick,
}: ChemistryVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const lastSavedAtRef = useRef<number>(0);
  const [speed, setSpeed] = useState<number>(1);
  const [resumedNotice, setResumedNotice] = useState(false);

  const canWatch = isUnlocked || Boolean(lecture.isFreePreview);
  const ytEmbed = extractYouTubeEmbed(lecture.videoUrl);
  const isDirectVideo =
    lecture.videoSource === 'direct' ||
    lecture.platform === 'Direct' ||
    (!ytEmbed &&
      (lecture.videoUrl.startsWith('/api/media/stream/') ||
        /\.(mp4|webm|ogg)(\?|$)/i.test(lecture.videoUrl)));

  const resolvedDirectUrl = React.useMemo(() => {
    if (!lecture.videoUrl) return '';
    if (lecture.videoUrl.startsWith('/api/media/stream/') && idToken) {
      const sep = lecture.videoUrl.includes('?') ? '&' : '?';
      return `${lecture.videoUrl}${sep}token=${encodeURIComponent(idToken)}`;
    }
    return lecture.videoUrl;
  }, [lecture.videoUrl, idToken]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  }, [speed]);

  useEffect(() => {
    setResumedNotice(false);
    lastSavedAtRef.current = 0;
  }, [lecture.id]);

  const handleLoadedMetadata = () => {
    const v = videoRef.current;
    if (!v) return;
    v.playbackRate = speed;
    if (initialPositionSeconds > 5 && v.duration > initialPositionSeconds + 5) {
      v.currentTime = initialPositionSeconds;
      setResumedNotice(true);
      setTimeout(() => setResumedNotice(false), 3500);
    }
  };

  const handleTimeUpdate = () => {
    const v = videoRef.current;
    if (!v || !v.duration || !onProgressSave) return;
    const now = Date.now();
    if (now - lastSavedAtRef.current < 8000) return;
    lastSavedAtRef.current = now;
    const pct = Math.min(100, Math.round((v.currentTime / v.duration) * 100));
    onProgressSave(pct >= 92 || isCompleted, pct, Math.floor(v.currentTime), Math.floor(v.duration));
  };

  const handleEnded = () => {
    const v = videoRef.current;
    if (onProgressSave) {
      onProgressSave(true, 100, Math.floor(v?.duration || 0), Math.floor(v?.duration || 0));
    }
  };

  const handleFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      el.requestFullscreen?.().catch(() => {});
    }
  };

  const formatSec = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${String(sec).padStart(2, '0')}`;
  };

  return (
    <div ref={containerRef} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
      {!canWatch ? (
        <div className="aspect-video bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 text-white flex flex-col items-center justify-center p-6 text-center">
          <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center mb-3">
            <Lock className="w-6 h-6 text-sky-300" />
          </div>
          <p className="text-xs font-bold uppercase tracking-wider text-sky-300 mb-1">
            {lecture.chapter} · Lecture {lecture.lectureNumber || 1}
          </p>
          <h3 className="text-base sm:text-lg font-bold max-w-md">{lecture.title}</h3>
          <p className="text-xs text-slate-300 mt-1.5 max-w-sm">
            Enroll in this course to unlock full HD Chemistry lectures, resume playback, and downloadable notes.
          </p>
          {onUnlockClick && (
            <button
              type="button"
              onClick={onUnlockClick}
              className="mt-4 min-h-[44px] px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold"
            >
              Unlock Course Now
            </button>
          )}
        </div>
      ) : isDirectVideo ? (
        <div className="relative aspect-video bg-black">
          <video
            key={resolvedDirectUrl}
            ref={videoRef}
            src={resolvedDirectUrl}
            controls
            controlsList="nodownload"
            playsInline
            poster={lecture.thumbnailUrl || undefined}
            onLoadedMetadata={handleLoadedMetadata}
            onTimeUpdate={handleTimeUpdate}
            onEnded={handleEnded}
            className="w-full h-full object-contain bg-black"
          />
          {resumedNotice && (
            <div className="absolute top-3 left-3 px-3 py-1 rounded-lg bg-slate-950/85 text-sky-300 text-xs font-semibold border border-sky-400/30">
              Resumed from {formatSec(initialPositionSeconds)}
            </div>
          )}
        </div>
      ) : ytEmbed ? (
        <div className="aspect-video bg-black">
          <iframe
            key={ytEmbed}
            src={ytEmbed}
            title={lecture.title}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      ) : (
        <div className="aspect-video bg-slate-950 flex flex-col items-center justify-center p-6 text-center text-white">
          <Video className="w-10 h-10 text-sky-400 mb-2" />
          <p className="text-sm font-bold">{lecture.title}</p>
          {lecture.videoUrl && (
            <a
              href={lecture.videoUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-3 min-h-[44px] px-5 py-2.5 rounded-xl bg-blue-700 text-white text-xs font-bold inline-flex items-center gap-1.5"
            >
              <Play className="w-4 h-4" /> Open Lecture Video
            </a>
          )}
        </div>
      )}

      {/* Player Control Strip */}
      <div className="p-3 sm:p-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2.5">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold text-blue-700 dark:text-sky-400">
            {lecture.chapter} · {lecture.duration}
            {lecture.isFreePreview && !isUnlocked ? ' · Free Preview' : ''}
          </p>
          <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
            {lecture.title}
          </h4>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {isDirectVideo && canWatch && (
            <select
              aria-label="Playback Speed"
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              className="h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200"
            >
              {[0.75, 1, 1.25, 1.5, 1.75, 2].map((s) => (
                <option key={s} value={s}>
                  {s}x Speed
                </option>
              ))}
            </select>
          )}

          <button
            type="button"
            onClick={handleFullscreen}
            title="Fullscreen"
            className="h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 inline-flex items-center gap-1 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <Maximize className="w-3.5 h-3.5" /> Full
          </button>

          {onPrev && (
            <button
              type="button"
              disabled={!hasPrev}
              onClick={onPrev}
              className="h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 disabled:opacity-40 inline-flex items-center gap-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Prev
            </button>
          )}

          {onNext && (
            <button
              type="button"
              disabled={!hasNext}
              onClick={onNext}
              className="h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 disabled:opacity-40 inline-flex items-center gap-1"
            >
              Next <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}

          {canWatch && onProgressSave && (
            <button
              type="button"
              onClick={() => onProgressSave(true, 100, Math.floor(videoRef.current?.duration || 0), Math.floor(videoRef.current?.duration || 0))}
              className={`h-9 px-3 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 ${
                isCompleted
                  ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                  : 'bg-blue-700 text-white hover:bg-blue-800'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              {isCompleted ? 'Completed' : 'Mark Complete'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
