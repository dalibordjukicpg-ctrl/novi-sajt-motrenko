import fs from "fs";
import path from "path";

import PDFDocument from "pdfkit";

import { PDF_FONT, pdfFontAvailable, registerPdfFonts } from "./pdf-fonts";

/** Margine prilagođene domaćim štampačima (~18–20 mm). */
export function mm(n: number): number {
  return (n * 72) / 25.4;
}

export const PDF_MARGINS = {
  top: mm(18),
  bottom: mm(26),
  left: mm(18),
  right: mm(18),
};

export type PdfBranding = {
  clinicName: string;
  clinicEmail: string;
  clinicWeb: string;
  clinicAddress?: string;
};

export type PdfFieldRow =
  | { kind: "pair"; label: string; value: string }
  | { kind: "block"; label: string; value: string };

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
  const maxW = Math.min(160, contentWidth(doc));
  const maxH = 52;
  const top = doc.page.margins.top;
  try {
    doc.image(logoPath, left, top, { fit: [maxW, maxH] });
    doc.y = top + maxH + 12;
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
  const padX = 10;
  const padY = 8;
  const rowH = 16;
  const boxH = padY * 2 + rows.length * rowH;
  const y = doc.y;

  doc
    .roundedRect(left, y, w, boxH, 6)
    .fillAndStroke("#faf7f4", "#eadfce");

  let rowY = y + padY;
  for (const row of rows) {
    doc
      .font(fontBold(doc))
      .fontSize(8.5)
      .fillColor("#7a6a5c")
      .text(row.label, left + padX, rowY, { width: 118 });
    doc
      .font(fontRegular(doc))
      .fontSize(9.5)
      .fillColor("#1a1208")
      .text(row.value, left + padX + 122, rowY, { width: w - padX * 2 - 122 });
    rowY += rowH;
  }

  doc.y = y + boxH + 14;
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
    .fontSize(18)
    .fillColor("#1a1208")
    .text(opts.title, doc.page.margins.left, doc.y, { width: cw });
  doc.moveDown(0.12);

  if (opts.subtitle) {
    doc
      .font(fontRegular(doc))
      .fontSize(12)
      .fillColor("#5c4a3a")
      .text(opts.subtitle, { width: cw });
    doc.moveDown(0.35);
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
): number {
  doc.font(fontRegular(doc)).fontSize(10);
  return doc.heightOfString(value.trim() || "—", { width, lineGap: 3 });
}

/** Kategorija sa naslovnom trakom i poljima label → vrijednost. */
export function drawCategorySection(
  doc: InstanceType<typeof PDFDocument>,
  opts: {
    index: number;
    title: string;
    fields: PdfFieldRow[];
  },
): void {
  const left = doc.page.margins.left;
  const w = contentWidth(doc);
  const titleH = 24;
  const padX = 12;
  const padY = 10;
  const labelW = 148;
  const gap = 8;
  const valueW = w - padX * 2 - labelW - gap;

  doc.moveDown(0.35);
  let y = doc.y;

  doc.roundedRect(left, y, w, titleH, 6).fill("#e8682a");
  doc
    .font(fontBold(doc))
    .fontSize(10.5)
    .fillColor("#ffffff")
    .text(`${opts.index}. ${opts.title.toUpperCase()}`, left + padX, y + 7, {
      width: w - padX * 2,
    });

  y += titleH + 6;
  let bodyH = padY * 2;
  for (const field of opts.fields) {
    if (field.kind === "pair") {
      bodyH += 18;
    } else {
      bodyH += 14 + measureBlockHeight(doc, field.value, w - padX * 2) + 8;
    }
  }

  doc.roundedRect(left, y, w, bodyH, 6).fillAndStroke("#ffffff", "#e8ddd2");

  let bodyY = y + padY;
  for (const field of opts.fields) {
    if (field.kind === "pair") {
      doc
        .font(fontBold(doc))
        .fontSize(9)
        .fillColor("#6b5c4f")
        .text(field.label, left + padX, bodyY, { width: labelW });
      doc
        .font(fontRegular(doc))
        .fontSize(10)
        .fillColor("#1a1208")
        .text(field.value || "—", left + padX + labelW + gap, bodyY, {
          width: valueW,
          lineGap: 2,
        });
      bodyY += 18;
    } else {
      doc
        .font(fontBold(doc))
        .fontSize(9)
        .fillColor("#6b5c4f")
        .text(field.label, left + padX, bodyY, { width: w - padX * 2 });
      bodyY += 13;
      doc
        .font(fontRegular(doc))
        .fontSize(10)
        .fillColor("#1a1208")
        .text(field.value.trim() || "—", left + padX, bodyY, {
          width: w - padX * 2,
          lineGap: 3,
        });
      bodyY +=
        measureBlockHeight(doc, field.value, w - padX * 2) + 8;
    }
  }

  doc.y = y + bodyH + 4;
}

export function drawFooters(
  doc: InstanceType<typeof PDFDocument>,
  branding: PdfBranding,
): void {
  const range = doc.bufferedPageRange();
  const total = range.count;
  for (let i = 0; i < total; i++) {
    doc.switchToPage(range.start + i);
    const left = doc.page.margins.left;
    const right = doc.page.width - doc.page.margins.right;
    const w = contentWidth(doc);
    const footerBandTop = doc.page.height - doc.page.margins.bottom + mm(2);
    const lineY = footerBandTop - mm(3);

    doc
      .moveTo(left, lineY)
      .lineTo(right, lineY)
      .strokeColor("#c9bdb1")
      .lineWidth(0.55)
      .stroke();

    const lines = [
      branding.clinicName,
      branding.clinicAddress,
      branding.clinicEmail,
      branding.clinicWeb,
    ].filter((x): x is string => Boolean(x && x.trim()));

    doc
      .font(fontRegular(doc))
      .fontSize(8)
      .fillColor("#555555")
      .text(lines.join("\n"), left, footerBandTop, {
        width: w,
        align: "center",
        lineGap: 1.5,
      });

    if (total > 1) {
      doc
        .font(fontRegular(doc))
        .fontSize(7.5)
        .fillColor("#888888")
        .text(`Stranica ${i + 1} / ${total}`, left, doc.page.height - mm(6), {
          width: w,
          align: "right",
        });
    }
  }
}
