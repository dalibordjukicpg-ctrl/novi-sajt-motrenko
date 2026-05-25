import fs from "fs";
import path from "path";

import PDFDocument from "pdfkit";

import { PDF_FONT, pdfFontAvailable, registerPdfFonts } from "./pdf-fonts";

/** Margine prilagođene A4 štampi. */
export function mm(n: number): number {
  return (n * 72) / 25.4;
}

export const PDF_MARGINS = {
  top: mm(14),
  bottom: mm(22),
  left: mm(16),
  right: mm(16),
};

/** Zona sadržaja iznad fiksnog footera. */
export const PDF_FOOTER_RESERVE = mm(20);

export type PdfBranding = {
  clinicName: string;
  clinicEmail: string;
  clinicWeb: string;
  clinicAddress?: string;
};

export type PdfFieldRow =
  | { kind: "pair"; label: string; value: string }
  | { kind: "block"; label: string; value: string; maxChars?: number };

function fontRegular(doc: InstanceType<typeof PDFDocument>): string {
  return pdfFontAvailable(doc) ? PDF_FONT.regular : "Helvetica";
}

function fontBold(doc: InstanceType<typeof PDFDocument>): string {
  return pdfFontAvailable(doc) ? PDF_FONT.bold : "Helvetica-Bold";
}

export function formatSubmittedAt(d: Date): string {
  try {
    return new Intl.DateTimeFormat("sr-Latn-ME", {
      dateStyle: "long",
      timeStyle: "short",
      timeZone: "Europe/Podgorica",
    }).format(d);
  } catch {
    return d.toISOString();
  }
}

export function resolveLogoPath(): string | null {
  const envRaw = process.env.CONTACT_PDF_LOGO_PATH?.trim();
  const candidates: string[] = [];
  if (envRaw) {
    candidates.push(
      path.isAbsolute(envRaw)
        ? envRaw
        : path.join(process.cwd(), envRaw.replace(/^\//, "")),
    );
  }
  candidates.push(path.join(process.cwd(), "public", "logo-hrc-budva.png"));
  for (const p of candidates) {
    if (p && fs.existsSync(p)) return p;
  }
  return null;
}

export function contentWidth(doc: InstanceType<typeof PDFDocument>): number {
  return doc.page.width - doc.page.margins.left - doc.page.margins.right;
}

export function contentBottomLimit(doc: InstanceType<typeof PDFDocument>): number {
  return doc.page.height - doc.page.margins.bottom - PDF_FOOTER_RESERVE;
}

export function createA4PdfDocument(info: {
  title: string;
  author: string;
  subject: string;
  keywords: string;
  creator: string;
}): InstanceType<typeof PDFDocument> {
  const doc = new PDFDocument({
    size: "A4",
    margins: PDF_MARGINS,
    info: {
      Title: info.title,
      Author: info.author,
      Subject: info.subject,
      Keywords: info.keywords,
      Creator: info.creator,
    },
  });
  registerPdfFonts(doc);
  return doc;
}

export function bufferFromPdfDoc(
  doc: InstanceType<typeof PDFDocument>,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on("data", (c) => chunks.push(c as Buffer));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });
}

function drawLogo(
  doc: InstanceType<typeof PDFDocument>,
  logoPath: string,
): void {
  const left = doc.page.margins.left;
  const maxW = Math.min(140, contentWidth(doc));
  const maxH = 40;
  const top = doc.page.margins.top;
  try {
    doc.image(logoPath, left, top, { fit: [maxW, maxH] });
    doc.y = top + maxH + 8;
  } catch (e) {
    console.warn("[pdf] Učitavanje loga nije uspjelo.", e);
    doc.y = top;
  }
}

function drawMetaBox(
  doc: InstanceType<typeof PDFDocument>,
  rows: Array<{ label: string; value: string }>,
): void {
  const left = doc.page.margins.left;
  const w = contentWidth(doc);
  const padX = 8;
  const padY = 6;
  const rowH = 13;
  const boxH = padY * 2 + rows.length * rowH;
  const y = doc.y;

  doc.roundedRect(left, y, w, boxH, 4).fillAndStroke("#faf7f4", "#eadfce");

  let rowY = y + padY;
  for (const row of rows) {
    doc
      .font(fontBold(doc))
      .fontSize(8)
      .fillColor("#7a6a5c")
      .text(row.label, left + padX, rowY, { width: 108 });
    doc
      .font(fontRegular(doc))
      .fontSize(8.5)
      .fillColor("#1a1208")
      .text(row.value, left + padX + 112, rowY, { width: w - padX * 2 - 112 });
    rowY += rowH;
  }

  doc.y = y + boxH + 8;
}

export function drawPdfHeader(
  doc: InstanceType<typeof PDFDocument>,
  opts: {
    title: string;
    subtitle?: string;
    submittedAt: Date;
    locale: string;
    publicRef?: string;
  },
): void {
  const cw = contentWidth(doc);
  const logoPath = resolveLogoPath();

  if (logoPath) {
    drawLogo(doc, logoPath);
  } else {
    doc.y = doc.page.margins.top;
  }

  doc
    .font(fontBold(doc))
    .fontSize(15)
    .fillColor("#1a1208")
    .text(opts.title, doc.page.margins.left, doc.y, { width: cw });
  doc.moveDown(0.08);

  if (opts.subtitle) {
    doc
      .font(fontRegular(doc))
      .fontSize(10.5)
      .fillColor("#5c4a3a")
      .text(opts.subtitle, { width: cw });
    doc.moveDown(0.25);
  }

  const metaRows = [
    { label: "Datum slanja", value: formatSubmittedAt(opts.submittedAt) },
    { label: "Jezik forme", value: opts.locale.toUpperCase() },
  ];
  if (opts.publicRef) {
    metaRows.push({ label: "Referenca / ID", value: opts.publicRef });
  }
  drawMetaBox(doc, metaRows);
}

function measureBlockHeight(
  doc: InstanceType<typeof PDFDocument>,
  value: string,
  width: number,
  fontSize = 9,
): number {
  doc.font(fontRegular(doc)).fontSize(fontSize);
  return doc.heightOfString(value.trim() || "—", { width, lineGap: 2 });
}

function normalizeBlockValue(value: string, maxChars?: number): string {
  const t = value.trim() || "—";
  if (!maxChars || t.length <= maxChars) return t;
  return `${t.slice(0, maxChars - 1).trim()}…`;
}

/** Kategorija — kompaktno, jedna A4 stranica. */
export function drawCategorySection(
  doc: InstanceType<typeof PDFDocument>,
  opts: {
    index: number;
    title: string;
    fields: PdfFieldRow[];
  },
): void {
  const limit = contentBottomLimit(doc);
  if (doc.y > limit - 28) return;

  const left = doc.page.margins.left;
  const w = contentWidth(doc);
  const titleH = 20;
  const padX = 10;
  const padY = 7;
  const labelW = 136;
  const gap = 6;
  const valueW = w - padX * 2 - labelW - gap;

  doc.moveDown(0.15);
  let y = doc.y;

  doc.roundedRect(left, y, w, titleH, 4).fill("#e8682a");
  doc
    .font(fontBold(doc))
    .fontSize(9.5)
    .fillColor("#ffffff")
    .text(`${opts.index}. ${opts.title.toUpperCase()}`, left + padX, y + 6, {
      width: w - padX * 2,
    });

  y += titleH + 4;
  let bodyH = padY * 2;
  for (const field of opts.fields) {
    if (field.kind === "pair") {
      bodyH += 15;
    } else {
      const v = normalizeBlockValue(field.value, field.maxChars);
      bodyH += 12 + measureBlockHeight(doc, v, w - padX * 2, 9) + 5;
    }
  }

  const maxBody = limit - y;
  if (bodyH > maxBody) bodyH = Math.max(28, maxBody);

  doc.roundedRect(left, y, w, bodyH, 4).fillAndStroke("#ffffff", "#e8ddd2");

  let bodyY = y + padY;
  for (const field of opts.fields) {
    if (bodyY > y + bodyH - 8) break;

    if (field.kind === "pair") {
      doc
        .font(fontBold(doc))
        .fontSize(8.5)
        .fillColor("#6b5c4f")
        .text(field.label, left + padX, bodyY, { width: labelW });
      doc
        .font(fontRegular(doc))
        .fontSize(9)
        .fillColor("#1a1208")
        .text(field.value || "—", left + padX + labelW + gap, bodyY, {
          width: valueW,
          lineGap: 1,
        });
      bodyY += 15;
    } else {
      const v = normalizeBlockValue(field.value, field.maxChars);
      doc
        .font(fontBold(doc))
        .fontSize(8.5)
        .fillColor("#6b5c4f")
        .text(field.label, left + padX, bodyY, { width: w - padX * 2 });
      bodyY += 11;
      doc
        .font(fontRegular(doc))
        .fontSize(9)
        .fillColor("#1a1208")
        .text(v, left + padX, bodyY, {
          width: w - padX * 2,
          lineGap: 2,
          height: Math.max(12, y + bodyH - bodyY - padY),
          ellipsis: true,
        });
      bodyY += measureBlockHeight(doc, v, w - padX * 2, 9) + 5;
    }
  }

  doc.y = y + bodyH + 3;
}

/** Fiksni footer na dnu A4 — ime klinike + web adresa. */
export function drawFooters(
  doc: InstanceType<typeof PDFDocument>,
  branding: PdfBranding,
): void {
  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(range.start + i);
    const left = doc.page.margins.left;
    const right = doc.page.width - doc.page.margins.right;
    const w = contentWidth(doc);
    const footerTop = doc.page.height - doc.page.margins.bottom + mm(1);
    const lineY = footerTop - mm(2.5);

    doc
      .moveTo(left, lineY)
      .lineTo(right, lineY)
      .strokeColor("#c9bdb1")
      .lineWidth(0.55)
      .stroke();

    const web = branding.clinicWeb.replace(/^https?:\/\//i, "");
    const webFull = branding.clinicWeb.startsWith("http")
      ? branding.clinicWeb
      : `https://${web}`;

    doc
      .font(fontBold(doc))
      .fontSize(8.5)
      .fillColor("#1a1208")
      .text(branding.clinicName, left, footerTop, { width: w, align: "center" });

    doc
      .font(fontRegular(doc))
      .fontSize(8)
      .fillColor("#e8682a")
      .text(webFull, left, footerTop + 11, { width: w, align: "center" });

    const subLines = [branding.clinicEmail, branding.clinicAddress]
      .filter((x): x is string => Boolean(x && x.trim()))
      .join("  ·  ");

    if (subLines) {
      doc
        .font(fontRegular(doc))
        .fontSize(7.5)
        .fillColor("#666666")
        .text(subLines, left, footerTop + 22, { width: w, align: "center" });
    }
  }
}
