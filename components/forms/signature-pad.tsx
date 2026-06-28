"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Eraser } from "lucide-react";

type Props = {
  /** PNG data URL ili prazan string */
  value: string;
  onChange: (dataUrl: string, hasInk: boolean) => void;
  clearLabel: string;
  hint: string;
  title: string;
  optionalLabel?: string;
  className?: string;
};

function clientPoint(
  canvas: HTMLCanvasElement,
  e: React.PointerEvent<HTMLCanvasElement>,
) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  return {
    x: (e.clientX - rect.left) * scaleX,
    y: (e.clientY - rect.top) * scaleY,
  };
}

export function SignaturePad({
  value,
  onChange,
  clearLabel,
  hint,
  title,
  optionalLabel,
  className,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const hasInkRef = useRef(false);
  const [hasInk, setHasInk] = useState(false);

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    const cssW = Math.max(parent.clientWidth, 280);
    const cssH = 160;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, cssW, cssH);

    if (value.startsWith("data:image/png")) {
      const img = new Image();
      img.onload = () => {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, cssW, cssH);
        const scale = Math.min(cssW / img.width, cssH / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        ctx.drawImage(img, (cssW - w) / 2, (cssH - h) / 2, w, h);
        hasInkRef.current = true;
        setHasInk(true);
      };
      img.src = value;
    } else {
      hasInkRef.current = false;
      setHasInk(false);
    }
  }, [value]);

  useEffect(() => {
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    return () => window.removeEventListener("resize", resizeCanvas);
  }, [resizeCanvas]);

  const exportPng = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !hasInkRef.current) {
      onChange("", false);
      return;
    }
    onChange(canvas.toDataURL("image/png"), true);
  }, [onChange]);

  const startStroke = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);
    drawingRef.current = true;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { x, y } = clientPoint(canvas, e);
    ctx.strokeStyle = "#1a1208";
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const continueStroke = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { x, y } = clientPoint(canvas, e);
    ctx.lineTo(x, y);
    ctx.stroke();
    if (!hasInkRef.current) {
      hasInkRef.current = true;
      setHasInk(true);
    }
  };

  const endStroke = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    try {
      canvasRef.current?.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    exportPng();
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const cssW = canvas.clientWidth;
    const cssH = canvas.clientHeight;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, cssW, cssH);
    hasInkRef.current = false;
    setHasInk(false);
    onChange("", false);
  };

  return (
    <div className={className}>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-neutral-500">
          {title}
          {optionalLabel ? (
            <span className="ml-2 font-normal normal-case tracking-normal text-neutral-400">
              {optionalLabel}
            </span>
          ) : null}
        </p>
        {hasInk ? (
          <button
            type="button"
            onClick={clear}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-500 transition hover:text-[#e8682a]"
          >
            <Eraser size={14} aria-hidden />
            {clearLabel}
          </button>
        ) : null}
      </div>
      <p className="mt-1 text-xs leading-relaxed text-neutral-500">{hint}</p>
      <div className="mt-2 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-inner">
        <canvas
          ref={canvasRef}
          className="block w-full touch-none cursor-crosshair"
          aria-label={title}
          onPointerDown={startStroke}
          onPointerMove={continueStroke}
          onPointerUp={endStroke}
          onPointerLeave={endStroke}
          onPointerCancel={endStroke}
        />
      </div>
    </div>
  );
}
