"use client";

import { useState } from "react";

type Props = {
  src: string;
  alt?: string;
  className?: string;
  placeholderClassName?: string;
};

/** Cover slika sa fallbackom ako fajl nedostaje na serveru (npr. nakon redeploya). */
export function SiteCoverImage({
  src,
  alt = "",
  className,
  placeholderClassName,
}: Props) {
  const [failed, setFailed] = useState(false);
  const placeholder =
    placeholderClassName ??
    "flex h-full w-full items-center justify-center bg-gradient-to-br from-site-brand/8 via-site-surface-a to-site-brand/10";

  if (!src.trim() || failed) {
    return <div className={placeholder} aria-hidden />;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={className}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}
