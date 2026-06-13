import { NextResponse } from "next/server";
import { headers } from "next/headers";

import {
  buildQuestionnairePatientConfirmation,
  buildQuestionnaireStaffHtml,
  collectQuestionnaireRecipientEmails,
  formatQuestionnairePatientName,
  sendQuestionnairePatientConfirmation,
  sendQuestionnaireStaffEmail,
} from "@/lib/email/send-questionnaire-email";
import { resolveUpitnikNotifyInbox } from "@/lib/email/resolve-notify-inbox";
import { isLocale, type Locale } from "@/lib/i18n";
import {
  isFormPatientTranslationEnabled,
  machineTranslateTextsToMe,
} from "@/lib/machine-translate";
import { generateQuestionnairePdf } from "@/lib/pdf/generate-questionnaire-pdf";
import { questionnairePdfAttachmentName } from "@/lib/pdf/pdf-filenames";
import { getQuestionnaireI18n } from "@/lib/questionnaire-i18n";
import {
  saveQuestionnaireSubmission,
  updateQuestionnaireSubmissionEmailFlags,
} from "@/lib/questionnaire/save-questionnaire-submission";
import { getSiteUrl, PRODUCTION_SITE_URL } from "@/lib/site-url";

export const runtime = "nodejs";

function getClientIp(h: Headers): string {
  const forwarded = h.get("x-forwarded-for");
  const ip =
    forwarded?.split(",")[0]?.trim() ??
    h.get("x-real-ip")?.trim() ??
    "";
  return ip.slice(0, 128) || "unknown";
}

/** Email klinici uvijek na crnogorskom (labelama i sadržajem). */
const STAFF_EMAIL_LOCALE: Locale = "me";

function questionnaireBranding() {
  const siteUrl = getSiteUrl();
  const addr = process.env.CONTACT_PDF_CLINIC_ADDRESS?.trim();
  const notify = resolveUpitnikNotifyInbox();
  return {
    clinicName:
      process.env.CONTACT_PDF_CLINIC_NAME?.trim() ||
      "Human Reproduction Center",
    clinicEmail:
      process.env.CONTACT_PDF_CLINIC_EMAIL?.trim() || notify,
    clinicWeb: siteUrl || PRODUCTION_SITE_URL,
    clinicAddress: addr && addr.length > 0 ? addr : undefined,
  };
}

/** Heuristika: vrijednost je slobodan tekst koji ima smisla prevoditi. */
function isFreeText(v: unknown): v is string {
  if (typeof v !== "string") return false;
  const s = v.trim();
  if (s.length < 2) return false;
  if (s === "da" || s === "ne") return false;
  if (/^[+\-\d.,\s/()]+$/.test(s)) return false;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) return false;
  if (/^https?:\/\//.test(s)) return false;
  if (/[šđčćžŠĐČĆŽ]/.test(s)) return false;
  return true;
}

/** Polja koja se ne prevode (ime, kontakt — ostaju original). */
const SKIP_TRANSLATE_KEYS = new Set([
  "_locale",
  "z_ime",
  "m_ime",
  "z_email",
  "m_email",
  "z_telefon",
  "m_telefon",
  "z_pasos",
  "m_pasos",
]);

async function translatePatientData(
  data: Record<string, unknown>,
  source: "en" | "ru",
): Promise<void> {
  const flatKeys: string[] = [];
  const flatVals: string[] = [];

  for (const [k, v] of Object.entries(data)) {
    if (SKIP_TRANSLATE_KEYS.has(k)) continue;
    if (isFreeText(v)) {
      flatKeys.push(k);
      flatVals.push(v);
    } else if (Array.isArray(v)) {
      for (let i = 0; i < v.length; i++) {
        const row = v[i];
        if (row && typeof row === "object") {
          for (const [rk, rv] of Object.entries(row as Record<string, unknown>)) {
            if (isFreeText(rv)) {
              flatKeys.push(`__arr:${k}:${i}:${rk}`);
              flatVals.push(rv);
            }
          }
        }
      }
    }
  }

  if (flatVals.length === 0) return;

  try {
    const translated = await machineTranslateTextsToMe(flatVals, source);
    for (let i = 0; i < flatKeys.length; i++) {
      const key = flatKeys[i]!;
      const tr = translated[i];
      if (!tr) continue;
      if (key.startsWith("__arr:")) {
        const [, arrKey, idxStr, fieldKey] = key.split(":");
        const arr = data[arrKey!] as Array<Record<string, unknown>>;
        if (arr && arr[Number(idxStr)]) {
          arr[Number(idxStr)]![fieldKey!] = tr;
        }
      } else {
        data[key] = tr;
      }
    }
  } catch (e) {
    console.warn("[upitnik] translate-to-me failed, sending original text:", e);
  }
}

export async function POST(req: Request): Promise<Response> {
  let data: Record<string, unknown>;
  try {
    data = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const rawLocale = typeof data._locale === "string" ? data._locale : "me";
  const submissionLocale: Locale = isLocale(rawLocale) ? rawLocale : "me";

  if (submissionLocale === "en" || submissionLocale === "ru") {
    if (isFormPatientTranslationEnabled()) {
      await translatePatientData(data, submissionLocale);
    } else {
      console.warn("[upitnik] patient translation not enabled — sending original text in", submissionLocale);
    }
  }

  const tStaff = getQuestionnaireI18n(STAFF_EMAIL_LOCALE);
  const tPatient = getQuestionnaireI18n(submissionLocale);

  const femaleEmail = String(data.z_email || "").trim().toLowerCase();
  const femaleNameRaw = String(data.z_ime || "").trim();
  const femaleNameStaff = femaleNameRaw || "Pacijent";
  const femaleNameGreeting = formatQuestionnairePatientName(
    femaleNameRaw,
    tStaff.email.patientFallbackName,
  );
  const maleEmail = String(data.m_email || "").trim().toLowerCase();
  const maleNameRaw = String(data.m_ime || "").trim();
  const maleNameStaff = maleNameRaw || "—";
  const maleNameGreeting = formatQuestionnairePatientName(
    maleNameRaw,
    tStaff.email.patientFallbackName,
  );
  const phone = String(data.z_telefon || data.m_telefon || "").trim();

  const langTag =
    submissionLocale === "en" ? " · ispunjen na engleskom"
    : submissionLocale === "ru" ? " · ispunjen na ruskom"
    : "";

  const submittedAt = new Date();
  const branding = questionnaireBranding();
  const toClinic = resolveUpitnikNotifyInbox();
  const subject = `${tStaff.email.subjectPrefix} ${femaleNameStaff} — ${submittedAt.toLocaleDateString("sr-ME")}${langTag}`;

  let pdf: Buffer;
  try {
    pdf = await generateQuestionnairePdf(
      { submittedAt, submissionLocale, data },
      branding,
    );
  } catch (e) {
    console.error("[upitnik] pdf", e);
    return NextResponse.json({ ok: false, error: "pdf_failed" }, { status: 500 });
  }

  const pdfFilename = questionnairePdfAttachmentName(femaleEmail);

  let submissionId: string;
  let ipAddress: string | null = null;
  let userAgent: string | null = null;
  try {
    const h = await headers();
    ipAddress = getClientIp(h).slice(0, 45);
    userAgent = h.get("user-agent")?.slice(0, 512) ?? null;
  } catch {
    /* headers optional */
  }

  try {
    const saved = await saveQuestionnaireSubmission({
      locale: submissionLocale,
      femaleName: femaleNameStaff,
      femaleEmail: femaleEmail || "—",
      maleName: maleNameRaw || null,
      maleEmail: maleEmail || null,
      phone: phone || null,
      formData: data,
      pdfBuffer: pdf,
      pdfFilename,
      submittedAt,
      ipAddress,
      userAgent,
    });
    submissionId = saved.id;
  } catch (e) {
    console.error("[upitnik] db save failed", e);
    return NextResponse.json({ ok: false, error: "save_failed" }, { status: 500 });
  }

  const summaryText = [
    `Primljen upitnik od: ${femaleNameStaff} (${femaleEmail || "—"}).`,
    maleNameRaw ? `Muški partner: ${maleNameStaff} (${maleEmail || "—"})` : null,
    submissionLocale !== "me"
      ? `Pacijent je ispunjavao formu na ${submissionLocale === "en" ? "engleskom" : "ruskom"} jeziku.`
      : null,
    "",
    "Puni pregled je u prilogu (PDF, A4 — spreman za štampu).",
    `Klinika: ${branding.clinicName}`,
    `Datum slanja (server): ${submittedAt.toISOString()}`,
  ]
    .filter((x) => x !== null)
    .join("\n");

  const staffHtml = buildQuestionnaireStaffHtml({
    t: tStaff,
    femaleName: femaleNameStaff,
    femaleEmail,
    maleName: maleNameStaff,
    maleEmail,
    phone,
    submittedAt,
    branding,
    submissionLocale,
  });

  const staffResult = await sendQuestionnaireStaffEmail({
    to: toClinic,
    subject,
    summaryText,
    html: staffHtml,
    replyTo: femaleEmail || undefined,
    pdfBuffer: pdf,
    pdfFilename,
  });

  if (!staffResult.ok) {
    console.error("[upitnik] staff email failed", {
      to: toClinic,
      staffResult,
      submissionId,
    });
  } else {
    const pdfIncluded =
      staffResult.deliveryMode === "pdf+reply" || staffResult.deliveryMode === "pdf";
    try {
      await updateQuestionnaireSubmissionEmailFlags(submissionId, {
        staffEmailSent: true,
        staffPdfEmailSent: pdfIncluded,
      });
    } catch (e) {
      console.error("[upitnik] staff email flags", e);
    }
    if (!pdfIncluded) {
      console.warn("[upitnik] staff email sent without PDF attachment", {
        to: toClinic,
        deliveryMode: staffResult.deliveryMode,
        submissionId,
      });
    }
  }

  const recipientEmails = collectQuestionnaireRecipientEmails(data);
  let anyPatientEmailSent = false;
  for (const patientEmail of recipientEmails) {
    const patientName =
      patientEmail === femaleEmail
        ? femaleNameGreeting
        : patientEmail === maleEmail
          ? maleNameGreeting
          : femaleNameGreeting;
    const confirmation = buildQuestionnairePatientConfirmation({
      t: tPatient,
      name: patientName,
      branding,
    });
    const patientResult = await sendQuestionnairePatientConfirmation({
      to: patientEmail,
      ...confirmation,
    });
    if (!patientResult.ok) {
      console.warn("[upitnik] patient confirmation failed", {
        to: patientEmail,
        patientResult,
        submissionId,
      });
    } else {
      anyPatientEmailSent = true;
    }
  }

  if (anyPatientEmailSent) {
    try {
      await updateQuestionnaireSubmissionEmailFlags(submissionId, { patientEmailSent: true });
    } catch (e) {
      console.error("[upitnik] patientEmailSent flag", e);
    }
  }

  return NextResponse.json({ ok: true });
}
