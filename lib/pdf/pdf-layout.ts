import fs from "fs";
import path from "path";

import PDFDocument from "pdfkit";

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

export function sectionHeading(
  doc: InstanceType<typeof PDFDocument>,
  title: string,
) {
  doc.moveDown(0.55);
  const left = doc.page.margins.left;
  const right = doc.page.width - doc.page.margins.right;
  doc.font("Helvetica-Bold").fontSize(11).fillColor("#1a1208").text(title);
  const lineY = doc.y;
  doc.moveDown(0.12);
  doc
    .moveTo(left, lineY + 2)
    .lineTo(right, lineY + 2)
    .strokeColor("#d4c4b4")
    .lineWidth(0.75)
    .stroke();
  doc.moveDown(0.4);
  doc.font("Helvetica").fontSize(10).fillColor("#2d2d2d");
}

export function drawLogo(
  doc: InstanceType<typeof PDFDocument>,
  logoPath: string,
): void {
  const left = doc.page.margins.left;
  const maxW = Math.min(160, contentWidth(doc));
  const maxH = 52;
  const top = doc.page.margins.top;
  try {
    doc.image(logoPath, left, top, {
      fit: [maxW, maxH],
    });
    doc.y = top + maxH + 14;
  } catch (e) {
    console.warn("[pdf] Učitavanje loga nije uspjelo.", e);
    doc.y = top;
  }
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
      .font("Helvetica")
      .fontSize(8)
      .fillColor("#555555")
      .text(lines.join("\n"), left, footerBandTop, {
        width: w,
        align: "center",
        lineGap: 1.5,
      });

    if (total > 1) {
      doc
        .font("Helvetica")
        .fontSize(7.5)
        .fillColor("#888888")
        .text(`Stranica ${i + 1} / ${total}`, left, doc.page.height - mm(6), {
          width: w,
          align: "right",
        });
    }
  }
}

export function createA4PdfDocument(info: {
  title: string;
  author: string;
  subject: string;
  keywords: string;
  creator: string;
}): InstanceType<typeof PDFDocument> {
  return new PDFDocument({
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
    doc
      .font("Helvetica-Oblique")
      .fontSize(8)
      .fillColor("#888888")
      .text(
        "Logo: postavite public/logo-hrc-budva.png ili CONTACT_PDF_LOGO_PATH.",
        doc.page.margins.left,
        doc.page.margins.top,
        { width: cw },
      );
    doc.moveDown(0.8);
  }

  doc
    .font("Helvetica-Bold")
    .fontSize(17)
    .fillColor("#1a1208")
    .text(opts.title, { width: cw });
  if (opts.subtitle) {
    doc.moveDown(0.15);
    doc
      .font("Helvetica")
      .fontSize(12)
      .fillColor("#444444")
      .text(opts.subtitle, { width: cw });
  }
  doc.moveDown(0.2);
  doc
    .font("Helvetica-Oblique")
    .fontSize(8.5)
    .fillColor("#666666")
    .text(
      "Format A4, margine prilagođene štampi. Otvorite u Adobe Readeru i odaberite „Štampaj“ (100% stvarna veličina ili „prilagodi stranici“).",
      { width: cw, lineGap: 2 },
    );
  doc.moveDown(0.35);
  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor("#444444")
    .text(`Datum i vrijeme slanja: ${formatSubmittedAt(opts.submittedAt)}`, {
      width: cw,
      lineGap: 2,
    });
  doc.text(`Jezik forme: ${opts.locale.toUpperCase()}`, { width: cw });
  if (opts.publicRef) {
    doc.text(`Referenca / ID: ${opts.publicRef}`, { width: cw });
  }
}
