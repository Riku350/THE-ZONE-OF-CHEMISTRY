import React, { useEffect, useRef, useState } from 'react';
import { Check, Crop, Download, Maximize2, RotateCcw, X, ZoomIn, ZoomOut } from 'lucide-react';
import { compressImagePreservingAspect } from '../lib/mediaUpload.ts';

interface ImageCropModalProps {
  file: File;
  defaultAspect?: '16:9' | '4:3' | '1:1';
  onCancel: () => void;
  onConfirm: (imageDataUrl: string) => void;
}

const ASPECT_RATIOS: Record<'16:9' | '4:3' | '1:1', number> = {
  '16:9': 16 / 9,
  '4:3': 4 / 3,
  '1:1': 1,
};

export function ImageCropModal({ file, defaultAspect = '16:9', onCancel, onConfirm }: ImageCropModalProps) {
  const [mode, setMode] = useState<'full' | 'crop'>('full');
  const [imgSrc, setImgSrc] = useState<string>('');
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);
  const [aspect, setAspect] = useState<'16:9' | '4:3' | '1:1'>(defaultAspect);
  const [zoom, setZoom] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [processing, setProcessing] = useState(false);

  const imgRef = useRef<HTMLImageElement | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const reader = new FileReader();
    reader.onload = () => setImgSrc(String(reader.result));
    reader.readAsDataURL(file);
  }, [file]);

  useEffect(() => {
    if (!imgSrc) return;
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      setDimensions({ width: img.width, height: img.height });
      if (mode === 'crop') drawCanvas();
    };
    img.src = imgSrc;
  }, [imgSrc]);

  useEffect(() => {
    if (mode === 'crop') drawCanvas();
  }, [mode, aspect, zoom, offsetX, offsetY]);

  function drawCanvas() {
    const canvas = previewCanvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;

    const ratio = ASPECT_RATIOS[aspect];
    const outW = 640;
    const outH = Math.round(outW / ratio);
    canvas.width = outW;
    canvas.height = outH;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, outW, outH);

    const imgRatio = img.width / img.height;
    let baseW = outW;
    let baseH = outH;
    if (imgRatio > ratio) {
      baseH = outH;
      baseW = outH * imgRatio;
    } else {
      baseW = outW;
      baseH = outW / imgRatio;
    }

    const drawW = baseW * zoom;
    const drawH = baseH * zoom;
    const dx = (outW - drawW) / 2 + (offsetX / 100) * Math.max(40, drawW - outW * 0.4);
    const dy = (outH - drawH) / 2 + (offsetY / 100) * Math.max(40, drawH - outH * 0.4);

    ctx.drawImage(img, dx, dy, drawW, drawH);
  }

  async function handleUseFullOriginal() {
    setProcessing(true);
    try {
      const compressed = await compressImagePreservingAspect(file, 1600, 0.88);
      onConfirm(compressed.dataUrl);
    } catch {
      if (imgSrc) onConfirm(imgSrc);
    } finally {
      setProcessing(false);
    }
  }

  function handleApplyCrop() {
    const img = imgRef.current;
    if (!img) return;
    setProcessing(true);

    const ratio = ASPECT_RATIOS[aspect];
    const finalW = aspect === '1:1' ? 720 : 1200;
    const finalH = Math.round(finalW / ratio);

    const outCanvas = document.createElement('canvas');
    outCanvas.width = finalW;
    outCanvas.height = finalH;
    const ctx = outCanvas.getContext('2d');
    if (!ctx) {
      setProcessing(false);
      return;
    }

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, finalW, finalH);

    const imgRatio = img.width / img.height;
    let baseW = finalW;
    let baseH = finalH;
    if (imgRatio > ratio) {
      baseH = finalH;
      baseW = finalH * imgRatio;
    } else {
      baseW = finalW;
      baseH = finalW / imgRatio;
    }

    const drawW = baseW * zoom;
    const drawH = baseH * zoom;
    const dx = (finalW - drawW) / 2 + (offsetX / 100) * Math.max(60, drawW - finalW * 0.4);
    const dy = (finalH - drawH) / 2 + (offsetY / 100) * Math.max(60, drawH - finalH * 0.4);

    ctx.drawImage(img, dx, dy, drawW, drawH);

    let result = outCanvas.toDataURL('image/webp', 0.84);
    if (result.length > 480_000) {
      result = outCanvas.toDataURL('image/jpeg', 0.72);
    }
    setProcessing(false);
    onConfirm(result);
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full sm:max-w-xl bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Maximize2 className="w-4 h-4 text-blue-700 dark:text-sky-400" />
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Image Preview &amp; Upload
              </h3>
              {dimensions && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                  Original: {dimensions.width} × {dimensions.height} px · {Math.round(file.size / 1024)} KB
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Switch Tabs */}
        <div className="px-5 pt-3 flex gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <button
            type="button"
            onClick={() => setMode('full')}
            className={`flex-1 min-h-[40px] px-3 rounded-xl text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-colors ${
              mode === 'full'
                ? 'bg-blue-700 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}
          >
            <Maximize2 className="w-3.5 h-3.5" /> Full Original Ratio (No Crop)
          </button>
          <button
            type="button"
            onClick={() => setMode('crop')}
            className={`flex-1 min-h-[40px] px-3 rounded-xl text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-colors ${
              mode === 'crop'
                ? 'bg-blue-700 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}
          >
            <Crop className="w-3.5 h-3.5" /> Optional Crop
          </button>
        </div>

        <div className="p-5 space-y-4">
          {mode === 'full' ? (
            <>
              <div className="rounded-xl overflow-hidden bg-slate-950 flex items-center justify-center border border-slate-200 dark:border-slate-700 max-h-72">
                {imgSrc && (
                  <img
                    src={imgSrc}
                    alt="Full Original Preview"
                    className="max-h-72 w-auto h-auto object-contain"
                  />
                )}
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Exact aspect ratio (portrait, landscape, or square) will be preserved without cropping any text or corners.
              </p>
            </>
          ) : (
            <>
              {/* Aspect Ratio Switcher */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Crop Ratio</span>
                <div className="flex gap-1.5">
                  {(['16:9', '4:3', '1:1'] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setAspect(r)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                        aspect === r
                          ? 'bg-blue-700 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {/* Live Canvas Preview */}
              <div className="rounded-xl overflow-hidden bg-slate-950 flex items-center justify-center border border-slate-200 dark:border-slate-700">
                <canvas ref={previewCanvasRef} className="w-full h-auto max-h-60 object-contain" />
              </div>

              {/* Controls */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <ZoomOut className="w-4 h-4 text-slate-400 shrink-0" />
                  <input
                    type="range"
                    min={1}
                    max={2.4}
                    step={0.05}
                    value={zoom}
                    onChange={(e) => setZoom(Number(e.target.value))}
                    className="flex-1 accent-blue-700"
                    aria-label="Zoom"
                  />
                  <ZoomIn className="w-4 h-4 text-slate-400 shrink-0" />
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="text-slate-500 dark:text-slate-400 block mb-1">Horizontal Position</label>
                    <input
                      type="range"
                      min={-50}
                      max={50}
                      value={offsetX}
                      onChange={(e) => setOffsetX(Number(e.target.value))}
                      className="w-full accent-blue-700"
                    />
                  </div>
                  <div>
                    <label className="text-slate-500 dark:text-slate-400 block mb-1">Vertical Position</label>
                    <input
                      type="range"
                      min={-50}
                      max={50}
                      value={offsetY}
                      onChange={(e) => setOffsetY(Number(e.target.value))}
                      className="w-full accent-blue-700"
                    />
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="px-5 py-4 bg-slate-50 dark:bg-slate-950/60 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {mode === 'crop' && (
              <button
                type="button"
                onClick={() => {
                  setZoom(1);
                  setOffsetX(0);
                  setOffsetY(0);
                }}
                className="min-h-[44px] px-3 text-xs font-semibold text-slate-600 dark:text-slate-300 inline-flex items-center gap-1.5"
              >
                <RotateCcw className="w-4 h-4" /> Reset
              </button>
            )}
            {imgSrc && (
              <a
                href={imgSrc}
                download={file.name || 'image.png'}
                className="min-h-[44px] px-3 text-xs font-semibold text-blue-700 dark:text-sky-400 inline-flex items-center gap-1.5"
              >
                <Download className="w-4 h-4" /> Original
              </a>
            )}
          </div>

          <div className="flex gap-2 ml-auto">
            <button
              type="button"
              onClick={onCancel}
              className="min-h-[44px] px-4 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={processing}
              onClick={mode === 'full' ? handleUseFullOriginal : handleApplyCrop}
              className="min-h-[44px] px-5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-xl inline-flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />{' '}
              {processing ? 'Processing...' : mode === 'full' ? 'Use Full Image' : 'Crop & Use'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
