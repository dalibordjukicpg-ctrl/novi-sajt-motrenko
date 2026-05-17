import fs from "fs";
import path from "path";

import PDFDocument from "pdfkit";

/** Margine prilagođene domaćim štampačima (~18–20 mm). */
function mm(n: number): number {
  return (n * 72) / 25.4;
}

const MARGIN_TOP = mm(18);
const MARGIN_LEFT = mm(18);
const MARGIN_RIGHT = mm(18);
const MARGIN_BOTTOM = mm(26);

export type ContactPdfBranding = {
  clinicName: string;
  clinicEmail: string;
  clinicWeb: string;
  /** Jednoredna adresa u podnožju (opciono). */
  clinicAddress?: string;
};

export type ContactPdfPayload = {
  submittedAt: Date;
  locale: string;
  fullName: string;
  email: string;
  phone: string;
  inquiryType: string | null;
  message: string;
  consentAccepted: boolean;
};

function formatSubmittedAt(d: Date): string {
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

/**
 * LOGO ORDINACIJE ZA PDF
 * ----------------------
 * Podrazumijevano: `public/logo-hrc-budva.png`
 * Ili: `CONTACT_PDF_LOGO_PATH` (apsolutno ili relativno od korijena projekta).
 */
function resolveLogoPath(): string | null {
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

function contentWidth(doc: InstanceType<typeof PDFDocument>): number {
  return (
    doc.page.width - doc.page.margins.left - doc.page.margins.right
  );
}

function sectionHeading(
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

function drawLogo(
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
    console.warn("[contact pdf] Učitavanje loga nije uspjelo.", e);
    doc.y = top;
  }
}

function drawFooters(
  doc: InstanceType<typeof PDFDocument>,
  branding: ContactPdfBranding,
): void {
  const range = doc.bufferedPageRange();
  const total = range.count;
  for (let i = 0; i < total; i++) {
    doc.switchToPage(range.start + i);
    const left = doc.page.margins.left;
    const right = doc.page.width - doc.page.margins.right;
    const w = contentWidth(doc);
    const footerBandTop =
      doc.page.height - doc.page.margins.bottom + mm(2);
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
        .text(
          `Stranica ${i + 1} / ${total}`,
          left,
          doc.page.height - mm(6),
          { width: w, align: "right" },
        );
    }
  }
}

export async function generateContactPdf(
  data: ContactPdfPayload,
  branding: ContactPdfBranding,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const doc = new PDFDocument({
      size: "A4",
      margins: {
        top: MARGIN_TOP,
        bottom: MARGIN_BOTTOM,
        left: MARGIN_LEFT,
        right: MARGIN_RIGHT,
      },
      info: {
        Title: "Kontakt upit sa sajta — A4",
        Author: branding.clinicName,
        Subject: `Upit: ${data.fullName}`,
        Keywords: "kontakt, ordinacija, A4",
        Creator: "Website contact form",
      },
    });

    doc.on("data", (c) => chunks.push(c as Buffer));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

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
      .text("Kontakt upit sa veb prezentacije", { width: cw });
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
      .text(`Datum i vrijeme slanja: ${formatSubmittedAt(data.submittedAt)}`, {
        width: cw,
        lineGap: 2,
      });
    doc.text(`Jezik forme: ${data.locale.toUpperCase()}`, { width: cw });

    sectionHeading(doc, "1. Podaci korisnika");
    doc.text(`Ime i prezime: ${data.fullName}`, { width: cw, lineGap: 3 });

    sectionHeading(doc, "2. Kontakt");
    doc.text(`E-mail: ${data.email}`, { width: cw, lineGap: 3 });
    doc.text(`Telefon: ${data.phone}`, { width: cw, lineGap: 3 });

    sectionHeading(doc, "3. Razlog javljanja / tip usluge");
    doc.text(
      data.inquiryType && data.inquiryType.trim().length > 0
        ? data.inquiryType.trim()
        : "— (nije popunjeno)",
      { width: cw, lineGap: 4 },
    );

    sectionHeading(doc, "4. Poruka");
    doc.text(data.message.trim(), {
      width: cw,
      lineGap: 4,
      align: "left",
    });

    sectionHeading(doc, "5. Saglasnost");
    doc.text(
      data.consentAccepted
        ? "Korisnik je potvrdio saglasnost sa obradom ličnih podataka radi odgovora na upit."
        : "Saglasnost nije zabilježena.",
      { width: cw, lineGap: 4 },
    );

    drawFooters(doc, branding);
    doc.end();
  });
}
