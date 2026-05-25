import { readFile } from "fs/promises";
import path from "path";

import { NextResponse } from "next/server";

import { localUploadAbsPathFromStorageKey } from "@/lib/media-storage-path";

export const dynamic = "force-dynamic";

const MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".bmp": "image/bmp",
  ".svg": "image/svg+xml",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".ogg": "video/ogg",
  ".mov": "video/quicktime",
};

type Props = { params: Promise<{ path: string[] }> };

export async function GET(_req: Request, { params }: Props) {
  const { path: segments } = await params;
  if (!segments?.length) {
    return new NextResponse(null, { status: 404 });
  }

  const storageKey = `uploads/${segments.map((s) => decodeURIComponent(s)).join("/")}`;
  const abs = localUploadAbsPathFromStorageKey(storageKey);
  if (!abs) {
    return new NextResponse(null, { status: 404 });
  }

  try {
    const buf = await readFile(abs);
    const ext = path.extname(abs).toLowerCase();
    return new NextResponse(buf, {
      headers: {
        "Content-Type": MIME[ext] ?? "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
