import fs from "fs";
import path from "path";

import type PDFDocument from "pdfkit";

export const PDF_FONT = {
  regular: "PdfDejaVuSans",
  bold: "PdfDejaVuSans-Bold",
  italic: "PdfDejaVuSans-Oblique",
} as const;

const FONT_FILES = {
  regular: "DejaVuSans.ttf",
  bold: "DejaVuSans-Bold.ttf",
  italic: "DejaVuSans-Oblique.ttf",
} as const;

function dejavuPackageTtfDir(): string | null {
  try {
    const pkg = require.resolve("dejavu-fonts-ttf/package.json");
    return path.join(path.dirname(pkg), "ttf");
  } catch {
    return null;
  }
}

function fontCandidates(name: string): string[] {
  const out: string[] = [
    path.join(process.cwd(), "public", "fonts", "pdf", name),
  ];
  const pkgDir = dejavuPackageTtfDir();
  if (pkgDir) out.push(path.join(pkgDir, name));
  out.push(path.join(process.cwd(), "node_modules", "dejavu-fonts-ttf", "ttf", name));
  return out;
}

function resolveFontFile(name: string): string | null {
  for (const p of fontCandidates(name)) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

/** Registruje fontove (Latin + Cyrillic: č, ć, š, ž, đ, русский). */
export function registerPdfFonts(doc: InstanceType<typeof PDFDocument>): void {
  const regular = resolveFontFile(FONT_FILES.regular);
  const bold = resolveFontFile(FONT_FILES.bold);
  const italic = resolveFontFile(FONT_FILES.italic);

  if (!regular || !bold) {
    throw new Error(
      "[pdf] DejaVu fontovi nisu pronađeni. Pokrenite: npm run copy-pdf-fonts",
    );
  }

  doc.registerFont(PDF_FONT.regular, regular);
  doc.registerFont(PDF_FONT.bold, bold);
  if (italic) doc.registerFont(PDF_FONT.italic, italic);
}

export function pdfFontAvailable(doc: InstanceType<typeof PDFDocument>): boolean {
  try {
    registerPdfFonts(doc);
    doc.font(PDF_FONT.regular);
    doc.font(PDF_FONT.bold);
    return true;
  } catch (e) {
    console.error("[pdf] Fontovi nisu dostupni — UTF-8 će biti neispravan.", e);
    return false;
  }
}

export function fontRegular(doc: InstanceType<typeof PDFDocument>): string {
  registerPdfFonts(doc);
  return PDF_FONT.regular;
}

export function fontBold(doc: InstanceType<typeof PDFDocument>): string {
  registerPdfFonts(doc);
  return PDF_FONT.bold;
}
