import { mkdir, writeFile } from "fs/promises";
import path from "path";

import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { media } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

const MAX_BYTES = 12 * 1024 * 1024;

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Niste prijavljeni." }, { status: 401 });
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

  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Dozvoljene su samo slike." }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  if (buf.length > MAX_BYTES) {
    return NextResponse.json({ error: "Fajl je prevelik." }, { status: 400 });
  }

  const orig = file.name || "upload";
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
      mimeType: file.type.slice(0, 128),
      sizeBytes: buf.length,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Upis u bazu nije uspio." }, { status: 500 });
  }

  revalidatePath("/admin/media");
  revalidatePath("/admin/settings");
  revalidatePath("/admin/content/hero");

  return NextResponse.json({ ok: true, id });
}
