import fs from "fs";
import path from "path";

import PDFDocument from "pdfkit";

import { fontBold, fontRegular, registerPdfFonts } from "./pdf-fonts";

/** Margine prilagođene A4 štampi — kompaktno, jedna stranica. */
export function mm(n: number): number {
  return (n * 72) / 25.4;
}

export const PDF_MARGINS = {
  top: mm(12),
  bottom: mm(16),
  left: mm(14),
  right: mm(14),
};

/** Zona sadržaja iznad fiksnog footera. */
export const PDF_FOOTER_RESERVE = mm(18);

export type PdfBranding = {
  clinicName: string;
  clinicEmail: string;
  clinicWeb: string;
  clinicAddress?: string;
};

export type PdfFieldRow =
  | { kind: "pair"; label: string; value: string }
  | { kind: "block"; label: string; value: string; flex?: number };

export type PdfSection = {
  index: number;
  title: string;
  fields: PdfFieldRow[];
};

export type PdfHeaderMetaLabels = {
  submittedAt: string;
  formLanguage: string;
  referenceId: string;
};

/** Stil višestraničnog PDF-a (kompaktan = kontakt/prijavnica). */
export type FlowLayoutConfig = {
  scale: number;
  fonts: {
    sectionTitle: number;
    label: number;
    value: number;
    groupHeading: number;
  };
  colors: {
    label: string;
    value: string;
    groupHeading: string;
  };
  valueBold: boolean;
  spacing: {
    sectionGap: number;
    rowMin: number;
    rowExtra: number;
    titleHeight: number;
    padX: number;
    padY: number;
    labelW: number;
    titleBodyGap: number;
    bodyPadTop: number;
    blockLabelH: number;
    pairGap: number;
  };
  zebraRows?: boolean;
  rowDividers?: boolean;
};

export const PDF_BRAND_ORANGE = "#e8682a";

/** Kompaktan layout — kontakt forma, prijavnica. */
export const COMPACT_FLOW: FlowLayoutConfig = {
  scale: 0.74,
  fonts: { sectionTitle: 8.5, label: 7.5, value: 8, groupHeading: 8 },
  colors: { label: "#6b5c4f", value: "#1a1208", groupHeading: "#6b5c4f" },
  valueBold: false,
  spacing: {
    sectionGap: 3.5,
    rowMin: 11,
    rowExtra: 1.5,
    titleHeight: 16,
    padX: 8,
    padY: 5,
    labelW: 128,
    titleBodyGap: 2.5,
    bodyPadTop: 10,
    blockLabelH: 9,
    pairGap: 5,
  },
};

/** Čitljiv layout — upitnik (veća slova, razmaci, odgovori u brand boji). */
export const QUESTIONNAIRE_FLOW: FlowLayoutConfig = {
  scale: 1,
  fonts: { sectionTitle: 11.5, label: 9.5, value: 10.5, groupHeading: 10.5 },
  colors: { label: "#5c4f44", value: PDF_BRAND_ORANGE, groupHeading: "#c45418" },
  valueBold: true,
  spacing: {
    sectionGap: 18,
    rowMin: 22,
    rowExtra: 10,
    titleHeight: 28,
    padX: 14,
    padY: 12,
    labelW: 168,
    titleBodyGap: 5,
    bodyPadTop: 14,
    blockLabelH: 14,
    pairGap: 10,
  },
  zebraRows: true,
  rowDividers: true,
};

const SINGLE_PAGE_SCALES = [1, 0.94, 0.88, 0.82, 0.76, 0.7] as const;

export function formatSubmittedAt(d: Date, locale = "sr-Latn-ME"): string {
  try {
    return new Intl.DateTimeFormat(locale, {
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
    autoFirstPage: true,
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
  scale: number,
): void {
  const left = doc.page.margins.left;
  const maxW = Math.min(128 * scale, contentWidth(doc));
  const maxH = 34 * scale;
  const top = doc.page.margins.top;
  try {
    doc.image(logoPath, left, top, { fit: [maxW, maxH] });
    doc.y = top + maxH + 6 * scale;
  } catch (e) {
    console.warn("[pdf] Učitavanje loga nije uspjelo.", e);
    doc.y = top;
  }
}

function drawMetaBox(
  doc: InstanceType<typeof PDFDocument>,
  rows: Array<{ label: string; value: string }>,
  scale: number,
): void {
  const left = doc.page.margins.left;
  const w = contentWidth(doc);
  const padX = 7 * scale;
  const padY = 5 * scale;
  const rowH = 11.5 * scale;
  const boxH = padY * 2 + rows.length * rowH;
  const y = doc.y;

  doc.roundedRect(left, y, w, boxH, 3).fillAndStroke("#faf7f4", "#eadfce");

  let rowY = y + padY;
  for (const row of rows) {
    doc
      .font(fontBold(doc))
      .fontSize(7.5 * scale)
      .fillColor("#7a6a5c")
      .text(row.label, left + padX, rowY, { width: 100 * scale, lineBreak: false });
    doc
      .font(fontRegular(doc))
      .fontSize(8 * scale)
      .fillColor("#1a1208")
      .text(row.value, left + padX + 102 * scale, rowY, {
        width: w - padX * 2 - 102 * scale,
        lineBreak: false,
      });
    rowY += rowH;
  }

  doc.y = y + boxH + 6 * scale;
}

export function drawPdfHeader(
  doc: InstanceType<typeof PDFDocument>,
  opts: {
    title: string;
    subtitle?: string;
    submittedAt: Date;
    locale: string;
    publicRef?: string;
    metaLabels: PdfHeaderMetaLabels;
    dateLocale?: string;
    scale?: number;
  },
): void {
  const scale = opts.scale ?? 1;
  const cw = contentWidth(doc);
  const logoPath = resolveLogoPath();

  if (logoPath) {
    drawLogo(doc, logoPath, scale);
  } else {
    doc.y = doc.page.margins.top;
  }

  doc
    .font(fontBold(doc))
    .fontSize(14 * scale)
    .fillColor("#1a1208")
    .text(opts.title, doc.page.margins.left, doc.y, { width: cw, lineBreak: false });
  doc.y += 16 * scale;

  if (opts.subtitle) {
    doc
      .font(fontRegular(doc))
      .fontSize(9.5 * scale)
      .fillColor("#5c4a3a")
      .text(opts.subtitle, doc.page.margins.left, doc.y, {
        width: cw,
        lineBreak: false,
      });
    doc.y += 12 * scale;
  }

  const dateLocale =
    opts.dateLocale ??
    (opts.locale === "ru"
      ? "ru-RU"
      : opts.locale === "en"
        ? "en-GB"
        : "sr-Latn-ME");

  const metaRows = [
    {
      label: opts.metaLabels.submittedAt,
      value: formatSubmittedAt(opts.submittedAt, dateLocale),
    },
    {
      label: opts.metaLabels.formLanguage,
      value: opts.locale.toUpperCase(),
    },
  ];
  if (opts.publicRef) {
    metaRows.push({
      label: opts.metaLabels.referenceId,
      value: opts.publicRef,
    });
  }
  drawMetaBox(doc, metaRows, scale);
}

/** Stvarna visina svakog polja (uključujući prelom labela). */
function measureFieldHeights(
  doc: InstanceType<typeof PDFDocument>,
  fields: PdfFieldRow[],
  innerW: number,
  labelW: number,
  valueW: number,
  cfg: FlowLayoutConfig,
): number[] {
  const scale = cfg.scale;
  const pairRowMin = cfg.spacing.rowMin * scale;
  const blockLabelH = cfg.spacing.blockLabelH * scale;
  const blockValueMin = 14 * scale;
  const valueFont = cfg.valueBold ? fontBold(doc) : fontRegular(doc);

  return fields.map((field) => {
    if (isGroupHeading(field)) {
      return 20 * scale;
    }

    if (field.kind === "pair") {
      const value = field.value.trim() || "—";
      doc.font(fontBold(doc)).fontSize(cfg.fonts.label * scale);
      const labelH = doc.heightOfString(field.label, { width: labelW, lineGap: 1 });
      doc.font(valueFont).fontSize(cfg.fonts.value * scale);
      const valueH = doc.heightOfString(value, { width: valueW, lineGap: 1 });
      return Math.max(pairRowMin, labelH, valueH) + cfg.spacing.rowExtra * scale;
    }

    const value = field.value.trim() || "—";
    doc.font(valueFont).fontSize(cfg.fonts.value * scale);
    const valueH = doc.heightOfString(value, { width: innerW, lineGap: 2 });
    return blockLabelH + Math.max(blockValueMin, valueH) + 6 * scale;
  });
}

function isGroupHeading(field: PdfFieldRow): boolean {
  return field.kind === "block" && field.flex === 0.2 && field.value.trim().length === 0;
}

type SectionPlan = {
  section: PdfSection;
  bodyHeight: number;
  titleHeight: number;
  gap: number;
  fieldHeights: number[];
};

function planSinglePageSections(
  doc: InstanceType<typeof PDFDocument>,
  sections: PdfSection[],
  startY: number,
  endY: number,
  cfg: FlowLayoutConfig,
): SectionPlan[] | null {
  const scale = cfg.scale;
  const w = contentWidth(doc);
  const padX = cfg.spacing.padX * scale;
  const innerW = w - padX * 2;
  const labelW = cfg.spacing.labelW * scale;
  const gap = cfg.spacing.pairGap * scale;
  const valueW = innerW - labelW - gap;
  const titleH = cfg.spacing.titleHeight * scale;
  const sectionGap = cfg.spacing.sectionGap * scale;

  const mins = sections.map((section) => {
    const naturalHeights = measureFieldHeights(
      doc,
      section.fields,
      innerW,
      labelW,
      valueW,
      cfg,
    );
    return {
      section,
      minBody: cfg.spacing.bodyPadTop * scale + naturalHeights.reduce((a, b) => a + b, 0),
      naturalHeights,
    };
  });

  let total =
    mins.reduce((sum, m) => sum + titleH + sectionGap + m.minBody, 0) - sectionGap;
  const available = endY - startY;
  if (total > available) return null;

  const extra = available - total;
  const sectionExtra = mins.length > 0 ? extra / mins.length : 0;

  return mins.map((m) => {
    const blockIndices = m.section.fields
      .map((f, i) => (f.kind === "block" ? i : -1))
      .filter((i) => i >= 0);
    const flexUnits = blockIndices.reduce((sum, i) => {
      const f = m.section.fields[i]!;
      return sum + (f.kind === "block" ? f.flex ?? 1 : 0);
    }, 0);

    const fieldHeights = [...m.naturalHeights];
    if (sectionExtra > 0 && flexUnits > 0) {
      for (const i of blockIndices) {
        const field = m.section.fields[i]!;
        const weight = field.kind === "block" ? field.flex ?? 1 : 0;
        fieldHeights[i]! += (sectionExtra * weight) / flexUnits;
      }
    }

    return {
      section: m.section,
      titleHeight: titleH,
      gap: sectionGap,
      bodyHeight: fieldHeights.reduce((a, b) => a + b, 0) + cfg.spacing.bodyPadTop * scale,
      fieldHeights,
    };
  });
}

function drawSectionAt(
  doc: InstanceType<typeof PDFDocument>,
  plan: SectionPlan,
  y: number,
  cfg: FlowLayoutConfig,
): number {
  const scale = cfg.scale;
  const left = doc.page.margins.left;
  const w = contentWidth(doc);
  const padX = cfg.spacing.padX * scale;
  const padY = cfg.spacing.padY * scale;
  const innerW = w - padX * 2;
  const labelW = cfg.spacing.labelW * scale;
  const gap = cfg.spacing.pairGap * scale;
  const valueW = innerW - labelW - gap;
  const blockLabelH = cfg.spacing.blockLabelH * scale;
  const valueFont = cfg.valueBold ? fontBold(doc) : fontRegular(doc);
  const { section, titleHeight, bodyHeight, fieldHeights } = plan;

  doc.roundedRect(left, y, w, titleHeight, 4).fill(PDF_BRAND_ORANGE);
  doc
    .font(fontBold(doc))
    .fontSize(cfg.fonts.sectionTitle * scale)
    .fillColor("#ffffff")
    .text(`${section.index}. ${section.title.toUpperCase()}`, left + padX, y + 7 * scale, {
      width: w - padX * 2,
      lineBreak: false,
    });

  const bodyY0 = y + titleHeight + cfg.spacing.titleBodyGap * scale;
  doc.roundedRect(left, bodyY0, w, bodyHeight, 4).fillAndStroke("#ffffff", "#eadfce");

  let cursorY = bodyY0 + padY;
  let pairIndex = 0;

  section.fields.forEach((field, idx) => {
    const rowH = fieldHeights[idx] ?? cfg.spacing.rowMin * scale;

    if (isGroupHeading(field)) {
      if (idx > 0) cursorY += 4 * scale;
      doc
        .font(fontBold(doc))
        .fontSize(cfg.fonts.groupHeading * scale)
        .fillColor(cfg.colors.groupHeading)
        .text(field.label.toUpperCase(), left + padX, cursorY, {
          width: innerW,
          lineBreak: false,
        });
      const lineY = cursorY + 14 * scale;
      doc
        .moveTo(left + padX, lineY)
        .lineTo(left + w - padX, lineY)
        .strokeColor("#f3dcc8")
        .lineWidth(0.75)
        .stroke();
      cursorY = lineY + 8 * scale;
      return;
    }

    if (field.kind === "pair") {
      if (cfg.rowDividers && pairIndex > 0) {
        doc
          .moveTo(left + padX, cursorY - 4 * scale)
          .lineTo(left + w - padX, cursorY - 4 * scale)
          .strokeColor("#f5ebe0")
          .lineWidth(0.5)
          .stroke();
      }

      if (cfg.zebraRows && pairIndex % 2 === 1) {
        doc
          .roundedRect(left + padX - 2, cursorY - 2 * scale, innerW + 4, rowH + 2 * scale, 2)
          .fill("#fdf9f5");
      }

      const value = field.value.trim() || "—";
      const textH = Math.max(rowH - cfg.spacing.rowExtra * scale, cfg.spacing.rowMin * scale);
      doc
        .font(fontBold(doc))
        .fontSize(cfg.fonts.label * scale)
        .fillColor(cfg.colors.label)
        .text(field.label, left + padX, cursorY + 2 * scale, {
          width: labelW,
          lineGap: 1,
          height: textH,
        });
      doc
        .font(valueFont)
        .fontSize(cfg.fonts.value * scale)
        .fillColor(cfg.colors.value)
        .text(value, left + padX + labelW + gap, cursorY + 2 * scale, {
          width: valueW,
          lineGap: 1,
          height: textH,
        });
      cursorY += rowH;
      pairIndex++;
      return;
    }

    const value = field.value.trim() || "—";
    doc
      .font(fontBold(doc))
      .fontSize(cfg.fonts.label * scale)
      .fillColor(cfg.colors.label)
      .text(field.label, left + padX, cursorY, {
        width: innerW,
        lineBreak: false,
      });
    cursorY += blockLabelH;

    const valueH = Math.max(14 * scale, rowH - blockLabelH - 4 * scale);
    doc
      .font(valueFont)
      .fontSize(cfg.fonts.value * scale)
      .fillColor(cfg.colors.value)
      .text(value, left + padX, cursorY, {
        width: innerW,
        lineGap: 2,
        height: valueH,
      });
    cursorY += valueH + 6 * scale;
  });

  return bodyY0 + bodyHeight;
}

/** Cijeli formular na jednoj A4 stranici — skalira se ako ima puno teksta. */
export function drawSinglePageSections(
  doc: InstanceType<typeof PDFDocument>,
  sections: PdfSection[],
): void {
  const startY = doc.y;
  const endY = contentBottomLimit(doc);

  for (const scale of SINGLE_PAGE_SCALES) {
    const cfg: FlowLayoutConfig = { ...COMPACT_FLOW, scale };
    const plans = planSinglePageSections(doc, sections, startY, endY, cfg);
    if (!plans) continue;

    let y = startY;
    for (let i = 0; i < plans.length; i++) {
      const plan = plans[i]!;
      y = drawSectionAt(doc, plan, y, cfg) + plan.gap;
    }
    doc.y = y;
    return;
  }

  const cfg: FlowLayoutConfig = {
    ...COMPACT_FLOW,
    scale: SINGLE_PAGE_SCALES[SINGLE_PAGE_SCALES.length - 1]!,
  };
  const padX = cfg.spacing.padX * cfg.scale;
  const innerW = contentWidth(doc) - padX * 2;
  const labelW = cfg.spacing.labelW * cfg.scale;
  const valueW = innerW - labelW - cfg.spacing.pairGap * cfg.scale;
  const plans =
    planSinglePageSections(doc, sections, startY, endY, cfg) ??
    sections.map((section) => {
      const naturalHeights = measureFieldHeights(
        doc,
        section.fields,
        innerW,
        labelW,
        valueW,
        cfg,
      );
      return {
        section,
        titleHeight: cfg.spacing.titleHeight * cfg.scale,
        gap: cfg.spacing.sectionGap * cfg.scale,
        bodyHeight: naturalHeights.reduce((a, b) => a + b, 0) + cfg.spacing.bodyPadTop * cfg.scale,
        fieldHeights: naturalHeights,
      };
    });

  let y = startY;
  for (const plan of plans) {
    y = drawSectionAt(doc, plan, y, cfg) + plan.gap;
  }
  doc.y = Math.min(y, endY);
}

/** @deprecated Koristiti drawSinglePageSections */
export function drawCategorySection(
  doc: InstanceType<typeof PDFDocument>,
  opts: {
    index: number;
    title: string;
    fields: PdfFieldRow[];
  },
): void {
  drawSinglePageSections(doc, [
    { index: opts.index, title: opts.title, fields: opts.fields },
  ]);
}

/** Fiksni footer u donjoj margini trenutne stranice. */
export function drawFooterOnCurrentPage(
  doc: InstanceType<typeof PDFDocument>,
  branding: PdfBranding,
): void {
  const left = doc.page.margins.left;
  const right = doc.page.width - doc.page.margins.right;
  const w = contentWidth(doc);
  const footerTop = doc.page.height - doc.page.margins.bottom - mm(13);
  const lineY = footerTop - mm(2);

  doc
    .moveTo(left, lineY)
    .lineTo(right, lineY)
    .strokeColor("#c9bdb1")
    .lineWidth(0.5)
    .stroke();

  const web = branding.clinicWeb.replace(/^https?:\/\//i, "");
  const webFull = branding.clinicWeb.startsWith("http")
    ? branding.clinicWeb
    : `https://${web}`;

  doc
    .font(fontBold(doc))
    .fontSize(8)
    .fillColor("#1a1208")
    .text(branding.clinicName, left, footerTop, { width: w, align: "center", lineBreak: false });

  doc
    .font(fontRegular(doc))
    .fontSize(7.5)
    .fillColor("#e8682a")
    .text(webFull, left, footerTop + 10, { width: w, align: "center", lineBreak: false });

  const subLines = [branding.clinicEmail, branding.clinicAddress]
    .filter((x): x is string => Boolean(x && x.trim()))
    .join("  ·  ");

  if (subLines) {
    doc
      .font(fontRegular(doc))
      .fontSize(7)
      .fillColor("#666666")
      .text(subLines, left, footerTop + 20, { width: w, align: "center", lineBreak: false });
  }
}

/** Fiksni footer u donjoj margini — uvijek na prvoj stranici. */
export function drawFooters(
  doc: InstanceType<typeof PDFDocument>,
  branding: PdfBranding,
): void {
  doc.switchToPage(0);
  drawFooterOnCurrentPage(doc, branding);
}

/** Footer na svim stranicama (višestranični PDF). */
export function drawFootersAllPages(
  doc: InstanceType<typeof PDFDocument>,
  branding: PdfBranding,
): void {
  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(range.start + i);
    drawFooterOnCurrentPage(doc, branding);
  }
}

function sectionBlockHeight(plan: SectionPlan, cfg: FlowLayoutConfig): number {
  return plan.titleHeight + cfg.spacing.titleBodyGap * cfg.scale + plan.bodyHeight;
}

/** Dijeli sekciju ako ne stane na jednu A4 stranicu. */
function splitSectionForPages(
  doc: InstanceType<typeof PDFDocument>,
  section: PdfSection,
  cfg: FlowLayoutConfig,
): PdfSection[] {
  const top = doc.page.margins.top;
  const bottom = contentBottomLimit(doc);
  if (planSinglePageSections(doc, [section], top, bottom, cfg)) {
    return [section];
  }
  if (section.fields.length <= 1) return [section];
  const mid = Math.ceil(section.fields.length / 2);
  const head: PdfSection = {
    index: section.index,
    title: section.title,
    fields: section.fields.slice(0, mid),
  };
  const tail: PdfSection = {
    index: section.index,
    title: `${section.title} — nastavak`,
    fields: section.fields.slice(mid),
  };
  return [
    ...splitSectionForPages(doc, head, cfg),
    ...splitSectionForPages(doc, tail, cfg),
  ];
}

/** Višestranični A4 layout — sekcije prelaze na sljedeću stranicu po potrebi. */
export function drawFlowSections(
  doc: InstanceType<typeof PDFDocument>,
  sections: PdfSection[],
  cfg: FlowLayoutConfig = COMPACT_FLOW,
): void {
  const gap = cfg.spacing.sectionGap * cfg.scale;
  const top = doc.page.margins.top;
  const bottom = contentBottomLimit(doc);
  let y = doc.y;

  const fallbackCfg: FlowLayoutConfig = { ...cfg, scale: cfg.scale * 0.88 };

  for (const section of sections) {
    for (const part of splitSectionForPages(doc, section, cfg)) {
      let activeCfg = cfg;
      let plan =
        planSinglePageSections(doc, [part], top, bottom, activeCfg)?.[0] ??
        planSinglePageSections(doc, [part], top, bottom, fallbackCfg)?.[0];
      if (!plan) continue;
      if (!planSinglePageSections(doc, [part], top, bottom, cfg)) {
        activeCfg = fallbackCfg;
      }

      const blockH = sectionBlockHeight(plan, activeCfg) + gap;
      if (y + blockH > bottom && y > top + 2) {
        doc.addPage();
        y = top;
        plan =
          planSinglePageSections(doc, [part], top, bottom, activeCfg)?.[0] ??
          planSinglePageSections(doc, [part], top, bottom, fallbackCfg)?.[0];
        if (!plan) continue;
      }

      y = drawSectionAt(doc, plan, y, activeCfg) + gap;
    }
  }

  doc.y = y;
}

export function assertSinglePdfPage(doc: InstanceType<typeof PDFDocument>): void {
  const range = doc.bufferedPageRange();
  if (range.count > 1) {
    console.warn("[pdf] Očekivana jedna A4 stranica, generisano:", range.count);
  }
}
