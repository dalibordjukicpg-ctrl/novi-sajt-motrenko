import { mkdir, writeFile } from "fs/promises";
import path from "path";

import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { getSession, hasPermission, PERMISSIONS } from "@/lib/auth";
import { db } from "@/lib/db";
import { media } from "@/lib/db/schema";
import { publicUrlFromMediaStorageKey } from "@/lib/media-public";

export const dynamic = "force-dynamic";

const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
/** Hero video — i dalje ga komprimuj ispod ~8 MB kad možeš (brže učitavanje). */
const MAX_VIDEO_BYTES = 20 * 1024 * 1024;

const VIDEO_EXTENSIONS = new Set([".mp4", ".webm", ".ogg", ".mov"]);
const IMAGE_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".avif",
  ".bmp",
  ".svg",
]);

function uploadKind(file: File, orig: string): "image" | "video" | null {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  const ext = path.extname(orig).toLowerCase();
  if (VIDEO_EXTENSIONS.has(ext)) return "video";
  if (IMAGE_EXTENSIONS.has(ext)) return "image";
  return null;
}

function mimeForInsert(file: File, orig: string, kind: "image" | "video"): string {
  const t = file.type.trim();
  if (t) return t.slice(0, 128);
  const ext = path.extname(orig).toLowerCase();
  const fallbacks: Record<string, string> = {
    ".mp4": "video/mp4",
    ".webm": "video/webm",
    ".ogg": "video/ogg",
    ".mov": "video/quicktime",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".avif": "image/avif",
    ".bmp": "image/bmp",
    ".svg": "image/svg+xml",
  };
  return (
    fallbacks[ext] ?? (kind === "video" ? "video/mp4" : "application/octet-stream")
  ).slice(0, 128);
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Niste prijavljeni." }, { status: 401 });
  }
  if (!hasPermission(session.role, PERMISSIONS.MEDIA_MANAGE)) {
    return NextResponse.json({ error: "Nemate dozvolu." }, { status: 403 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Neispravan zahtjev." }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Nedostaje fajl." }, { status: 400 });
  }

  const orig = file.name || "upload";
  const kind = uploadKind(file, orig);
  if (!kind) {
    return NextResponse.json(
      { error: "Dozvoljene su slike ili video (MP4, WebM, OGG, MOV)." },
      { status: 400 },
    );
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const maxBytes = kind === "image" ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
  if (buf.length > maxBytes) {
    const mb = Math.floor(maxBytes / (1024 * 1024));
    return NextResponse.json(
      {
        error:
          kind === "video"
            ? `Video je prevelik (max ${mb} MB). Smanji rezoluciju ili kompresiju (npr. ffmpeg).`
            : `Slika je prevelika (max ${mb} MB).`,
      },
      { status: 400 },
    );
  }
  const ext = path.extname(orig).slice(0, 12) || ".bin";
  const id = randomUUID();
  const relKey = `uploads/${id}${ext}`;
  const absDir = path.join(process.cwd(), "public", "uploads");
  const absFile = path.join(process.cwd(), "public", relKey);

  try {
    await mkdir(absDir, { recursive: true });
    await writeFile(absFile, buf);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Snimanje na disk nije uspjelo." }, { status: 500 });
  }

  try {
    await db.insert(media).values({
      id,
      filename: orig.slice(0, 512),
      storageKey: relKey,
      mimeType: mimeForInsert(file, orig, kind),
      sizeBytes: buf.length,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Upis u bazu nije uspio." }, { status: 500 });
  }

  revalidatePath("/admin/media");
  revalidatePath("/admin/settings");
  revalidatePath("/admin/content/hero");

  return NextResponse.json({
    ok: true,
    id,
    url: publicUrlFromMediaStorageKey(relKey),
    filename: orig.slice(0, 512),
    mimeType: mimeForInsert(file, orig, kind),
  });
}
