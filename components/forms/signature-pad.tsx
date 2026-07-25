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

/**
 * Koordinate u CSS pikselima (ne bitmap). Canvas koristi setTransform(dpr),
 * pa se ne smije još jednom množiti sa canvas.width/rect.width — to na
 * telefonima (DPR 2–3) pomjera crtanje van vidljivog polja.
 */
function cssPoint(
  canvas: HTMLCanvasElement,
  clientX: number,
  clientY: number,
) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: clientX - rect.left,
    y: clientY - rect.top,
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
  const activePointerRef = useRef<number | null>(null);
  /** Zadnji exportovani data URL — da resize ne briše potpis bez potrebe. */
  const lastExportedRef = useRef(value);
  const [hasInk, setHasInk] = useState(false);

  const paintBlank = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number) => {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
  }, []);

  const resizeCanvas = useCallback(
    (restoreFrom: string | null) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const parent = canvas.parentElement;
      if (!parent) return;

      // Sačuvaj trenutni crtež prije resize-a (npr. rotacija / tastatura).
      let snapshot: string | null = null;
      if (hasInkRef.current && canvas.width > 0 && canvas.height > 0) {
        try {
          snapshot = canvas.toDataURL("image/png");
        } catch {
          snapshot = null;
        }
      }

      const cssW = Math.max(parent.clientWidth, 280);
      const cssH = Math.max(Math.round(Math.min(window.innerWidth, 480) * 0.42), 180);
      const dpr = Math.min(window.devicePixelRatio || 1, 3);

      canvas.style.width = `${cssW}px`;
      canvas.style.height = `${cssH}px`;
      canvas.width = Math.round(cssW * dpr);
      canvas.height = Math.round(cssH * dpr);

      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      paintBlank(ctx, cssW, cssH);

      const source =
        restoreFrom?.startsWith("data:image/png")
          ? restoreFrom
          : snapshot?.startsWith("data:image/png")
            ? snapshot
            : null;

      if (!source) {
        hasInkRef.current = false;
        setHasInk(false);
        return;
      }

      const img = new Image();
      img.onload = () => {
        const live = canvasRef.current?.getContext("2d");
        if (!live || canvasRef.current !== canvas) return;
        paintBlank(live, cssW, cssH);
        const scale = Math.min(cssW / img.width, cssH / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        live.drawImage(img, (cssW - w) / 2, (cssH - h) / 2, w, h);
        hasInkRef.current = true;
        setHasInk(true);
      };
      img.src = source;
    },
    [paintBlank],
  );

  // Inicijalni layout + window (bez re-rendera na svaki onChange — to bi
  // async reload PNG-a na telefonu obrisao novi potez).
  useEffect(() => {
    resizeCanvas(value || null);
    lastExportedRef.current = value;

    const onResize = () => {
      if (drawingRef.current) return;
      resizeCanvas(lastExportedRef.current || null);
    };
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
    // Samo mount — value se ne stavlja u deps namjerno.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Vanjsko brisanje (npr. reset forme): value === ""
  useEffect(() => {
    if (value === "" && hasInkRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (canvas && ctx) {
        paintBlank(ctx, canvas.clientWidth, canvas.clientHeight);
      }
      hasInkRef.current = false;
      setHasInk(false);
      lastExportedRef.current = "";
    }
  }, [value, paintBlank]);

  const exportPng = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !hasInkRef.current) {
      lastExportedRef.current = "";
      onChange("", false);
      return;
    }
    const dataUrl = canvas.toDataURL("image/png");
    lastExportedRef.current = dataUrl;
    onChange(dataUrl, true);
  }, [onChange]);

  const strokeStyle = (ctx: CanvasRenderingContext2D) => {
    ctx.strokeStyle = "#1a1208";
    // Deblji potez na touchu — prst je manje precizan od miša.
    ctx.lineWidth = 2.6;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  };

  const startStroke = (e: React.PointerEvent<HTMLCanvasElement>) => {
    // Jedan prst / stilus odjednom.
    if (activePointerRef.current !== null) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    e.preventDefault();
    e.stopPropagation();

    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {
      /* stariji browseri */
    }

    activePointerRef.current = e.pointerId;
    drawingRef.current = true;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { x, y } = cssPoint(canvas, e.clientX, e.clientY);
    strokeStyle(ctx);
    ctx.beginPath();
    ctx.moveTo(x, y);
    // Tačka i na tap bez pomjeranja.
    ctx.lineTo(x + 0.01, y + 0.01);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const continueStroke = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    if (activePointerRef.current !== e.pointerId) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    e.preventDefault();

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { x, y } = cssPoint(canvas, e.clientX, e.clientY);
    strokeStyle(ctx);
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);

    if (!hasInkRef.current) {
      hasInkRef.current = true;
      setHasInk(true);
    }
  };

  const endStroke = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (activePointerRef.current !== e.pointerId) return;
    if (!drawingRef.current) return;

    drawingRef.current = false;
    activePointerRef.current = null;

    try {
      canvasRef.current?.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }

    if (hasInkRef.current) {
      exportPng();
    }
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    paintBlank(ctx, canvas.clientWidth, canvas.clientHeight);
    hasInkRef.current = false;
    setHasInk(false);
    lastExportedRef.current = "";
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
            className="inline-flex min-h-11 items-center gap-1.5 px-1 text-xs font-semibold text-neutral-500 transition hover:text-[#e8682a]"
          >
            <Eraser size={14} aria-hidden />
            {clearLabel}
          </button>
        ) : null}
      </div>
      <p className="mt-1 text-xs leading-relaxed text-neutral-500">{hint}</p>
      <div
        className="mt-2 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-inner"
        style={{ touchAction: "none" }}
      >
        <canvas
          ref={canvasRef}
          className="block w-full cursor-crosshair touch-none select-none"
          style={{ touchAction: "none", WebkitUserSelect: "none" }}
          aria-label={title}
          onPointerDown={startStroke}
          onPointerMove={continueStroke}
          onPointerUp={endStroke}
          onPointerCancel={endStroke}
          // Ne koristiti onPointerLeave — na iOS/Android često prekine potez
          // dok prst još crta; setPointerCapture drži događaje do pointerup.
        />
      </div>
    </div>
  );
}
