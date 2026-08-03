/**
 * Prima upload fajlove na produkciju (Hostinger private/uploads).
 * POST /api/sync/uploads?secret=…
 * Body JSON: { files: [{ storageKey: "uploads/….jpg", dataBase64: "…" }] }
 */
import { mkdir, writeFile } from "fs/promises";
import path from "path";

import { getContentSyncSecret } from "@/lib/content-sync-secret";
import { localUploadAbsPathFromStorageKey } from "@/lib/media-storage-path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const maxDuration = 60;

function checkSecret(req: Request): boolean {
  const secret = new URL(req.url).searchParams.get("secret");
  if (!secret) return false;
  try {
    return secret === getContentSyncSecret();
  } catch {
    return false;
  }
}

type UploadItem = {
  storageKey?: string;
  dataBase64?: string;
};

export async function POST(req: Request) {
  if (!checkSecret(req)) {
    return new Response("Unauthorized", { status: 401 });
  }

  let body: { files?: UploadItem[] };
  try {
    body = (await req.json()) as { files?: UploadItem[] };
  } catch {
    return Response.json({ error: "Neispravan JSON." }, { status: 400 });
  }

  const files = Array.isArray(body.files) ? body.files : [];
  if (files.length === 0) {
    return Response.json({ error: "Nema fajlova." }, { status: 400 });
  }
  if (files.length > 40) {
    return Response.json({ error: "Max 40 fajlova po zahtjevu." }, { status: 400 });
  }

  const saved: string[] = [];
  const skipped: string[] = [];
  const errors: string[] = [];

  for (const file of files) {
    const key = String(file.storageKey ?? "")
      .trim()
      .replace(/^\/+/, "");
    const b64 = String(file.dataBase64 ?? "").trim();
    if (!key.startsWith("uploads/") || key.includes("..")) {
      errors.push(`bad key: ${key}`);
      continue;
    }
    if (!b64) {
      errors.push(`empty: ${key}`);
      continue;
    }

    const abs = localUploadAbsPathFromStorageKey(key);
    if (!abs) {
      errors.push(`path: ${key}`);
      continue;
    }

    try {
      const buf = Buffer.from(b64, "base64");
      if (buf.length === 0 || buf.length > 25 * 1024 * 1024) {
        errors.push(`size: ${key}`);
        continue;
      }
      await mkdir(path.dirname(abs), { recursive: true });
      await writeFile(abs, buf);
      saved.push(key);
    } catch (e) {
      errors.push(`${key}: ${(e as Error).message}`);
    }
  }

  return Response.json({ ok: errors.length === 0, saved, skipped, errors });
}
