import type { Metadata } from "next";

import { absoluteSiteUrl } from "@/lib/site-url";

/** Dodaje canonical i Open Graph URL za datu javnu putanju. */
export function withCanonical(path: string, meta: Metadata = {}): Metadata {
  const url = absoluteSiteUrl(path);
  return {
    ...meta,
    alternates: {
      ...meta.alternates,
      canonical: url,
    },
    openGraph: {
      ...meta.openGraph,
      url,
    },
  };
}
