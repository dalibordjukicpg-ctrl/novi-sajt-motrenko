"use client";

import { useCallback, useRef, type PointerEvent } from "react";

import {
  clampImageFocusY,
  objectPositionFromFocusY,
} from "@/lib/image-focus";

type Props = {
  src: string;
  focusY: number;
  onChange: (focusY: number) => void;
  /** Aspect ratio class, default blog 16:10. */
  aspectClassName?: string;
  label?: string;
};

/**
 * 16:10 (ili drugi) okvir sa object-cover + prevuci / slider za vertikalni fokus.
 */
export function ImageFocusPreview({
  src,
  focusY,
  onChange,
  aspectClassName = "aspect-[16/10]",
  label = "Pozicija u okviru (povuci sliku ili koristi klizač)",
}: Props) {
  const y = clampImageFocusY(focusY);
  const dragRef = useRef<{ startY: number; startFocus: number } | null>(null);

  const setY = useCallback(
    (next: number) => {
      onChange(clampImageFocusY(next));
    },
    [onChange],
  );

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { startY: e.clientY, startFocus: y };
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    const box = e.currentTarget.getBoundingClientRect();
    if (box.height < 1) return;
    const delta = e.clientY - dragRef.current.startY;
    // Prevuci dolje → vidi vrh (manji Y); prevuci gore → vidi dno (veći Y).
    const next = dragRef.current.startFocus - (delta / box.height) * 100;
    setY(next);
  };

  const endDrag = (e: PointerEvent<HTMLDivElement>) => {
    if (dragRef.current) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    }
    dragRef.current = null;
  };

  return (
    <div className="mt-4 space-y-2">
      <p className="text-xs text-neutral-600">{label}</p>
      <div
        className={`relative w-full max-w-md cursor-ns-resize overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100 select-none ${aspectClassName}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        role="presentation"
        title="Povuci gore/dolje da pozicioniraš sliku"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt=""
          draggable={false}
          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
          style={{ objectPosition: objectPositionFromFocusY(y) }}
        />
      </div>
      <div className="flex max-w-md items-center gap-3">
        <span className="shrink-0 text-[10px] font-medium uppercase tracking-wider text-neutral-500">
          Gore
        </span>
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={y}
          onChange={(e) => setY(Number(e.target.value))}
          className="h-2 w-full cursor-pointer accent-[#f37021]"
          aria-label="Vertikalna pozicija slike"
        />
        <span className="shrink-0 text-[10px] font-medium uppercase tracking-wider text-neutral-500">
          Dolje
        </span>
      </div>
      <p className="text-[11px] text-neutral-500">Fokus: {y}% (0 = vrh, 100 = dno)</p>
    </div>
  );
}
