import fs from "fs";
import path from "path";

import type PDFDocument from "pdfkit";

export const PDF_FONT = {
  regular: "PdfDejaVuSans",
  bold: "PdfDejaVuSans-Bold",
  italic: "PdfDejaVuSans-Oblique",
} as const;

function fontCandidates(name: string): string[] {
  return [
    path.join(process.cwd(), "node_modules/dejavu-fonts-ttf/ttf", name),
    path.join(process.cwd(), "public/fonts/pdf", name),
  ];
}

function resolveFontFile(name: string): string | null {
  for (const p of fontCandidates(name)) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

/** Registruje fontove sa podrškom za sr/bs/hr (č, ć, š, ž, đ). */
export function registerPdfFonts(doc: InstanceType<typeof PDFDocument>): void {
  const regular = resolveFontFile("DejaVuSans.ttf");
  const bold = resolveFontFile("DejaVuSans-Bold.ttf");
  const italic = resolveFontFile("DejaVuSans-Oblique.ttf");

  if (regular) doc.registerFont(PDF_FONT.regular, regular);
  if (bold) doc.registerFont(PDF_FONT.bold, bold);
  if (italic) doc.registerFont(PDF_FONT.italic, italic);
}

export function pdfFontAvailable(doc: InstanceType<typeof PDFDocument>): boolean {
  try {
    doc.font(PDF_FONT.regular);
    return true;
  } catch {
    return false;
  }
}
