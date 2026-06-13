import { NextResponse } from "next/server";

import { DEFAULT_NOTIFY_INBOX } from "@/lib/email/resolve-notify-inbox";
import { sendResendEmail } from "@/lib/email/send-resend-email";
import { isLocale, type Locale } from "@/lib/i18n";
import {
  isFormPatientTranslationEnabled,
  machineTranslateTextsToMe,
} from "@/lib/machine-translate";
import { getQuestionnaireI18n, type QuestionnaireI18n } from "@/lib/questionnaire-i18n";

export const runtime = "nodejs";

/** Email klinici uvijek na crnogorskom (labelama i sadržajem). */
const STAFF_EMAIL_LOCALE: Locale = "me";

/** Heuristika: vrijednost je slobodan tekst koji ima smisla prevoditi. */
function isFreeText(v: unknown): v is string {
  if (typeof v !== "string") return false;
  const s = v.trim();
  if (s.length < 2) return false;
  // Da/Ne — već se prevodi u funkciji yn()
  if (s === "da" || s === "ne") return false;
  // Pun broj
  if (/^[+\-\d.,\s/()]+$/.test(s)) return false;
  // Datum ISO
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  // Email
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) return false;
  // URL
  if (/^https?:\/\//.test(s)) return false;
  // Crnogorski/srpski tekst — ako sadrži ŠĐČĆŽ ili specifične riječi → preskoči
  if (/[šđčćžŠĐČĆŽ]/.test(s)) return false;
  return true;
}

/**
 * Prevodi sve slobodne tekstove iz pacijentovog odgovora na crnogorski
 * (in-place mutacija dobijene strukture). Ne dira `da`/`ne`, brojeve, datume.
 */
async function translatePatientData(
  data: Record<string, unknown>,
  source: "en" | "ru",
): Promise<void> {
  const flatKeys: string[] = [];
  const flatVals: string[] = [];

  for (const [k, v] of Object.entries(data)) {
    if (isFreeText(v)) {
      flatKeys.push(k);
      flatVals.push(v);
    } else if (Array.isArray(v)) {
      // Dinamičke tabele (z_trudnoce, z_lijekovi, ...) — element je objekat sa stringovima
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

function esc(s: unknown, fallback: string): string {
  if (s == null || s === "") return `<em style="color:#999">${fallback}</em>`;
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>");
}

function yn(v: string | undefined, t: QuestionnaireI18n): string {
  if (v === "da") return `✅ ${t.ui.yes}`;
  if (v === "ne") return `❌ ${t.ui.no}`;
  return `<em style="color:#999">${t.email.notAnswered}</em>`;
}

function row(label: string, value: unknown, t: QuestionnaireI18n): string {
  return `<tr>
    <td style="padding:5px 12px 5px 0;color:#555;vertical-align:top;width:260px">${label}</td>
    <td style="padding:5px 0;color:#1a1a1a;vertical-align:top">${esc(value, t.email.notEntered)}</td>
  </tr>`;
}

function ynRow(label: string, value: string | undefined, detail: unknown, t: QuestionnaireI18n): string {
  const detailHtml = detail ? `<br><span style="color:#555;font-size:0.9em">${esc(detail, "")}</span>` : "";
  return `<tr>
    <td style="padding:5px 12px 5px 0;color:#555;vertical-align:top;width:260px">${label}</td>
    <td style="padding:5px 0;color:#1a1a1a;vertical-align:top">${yn(value, t)}${detailHtml}</td>
  </tr>`;
}

function section(title: string, content: string): string {
  return `<div style="margin-top:28px">
    <h2 style="font-size:15px;font-weight:700;color:#e8682a;border-bottom:2px solid #e8682a;padding-bottom:6px;margin:0 0 10px">${title}</h2>
    <table style="border-collapse:collapse;width:100%;font-size:13px;line-height:1.5">${content}</table>
  </div>`;
}

function tableSection(title: string, rows: Record<string, string>[]): string {
  if (!rows || rows.length === 0) return "";
  const headers = Object.keys(rows[0]!);
  const head = headers.map(h => `<th style="padding:6px 8px;text-align:left;background:#f9f4ef;color:#555;font-size:12px;border-bottom:1px solid #e5d5c5">${h}</th>`).join("");
  const body = rows.map(r =>
    `<tr>${headers.map(h => `<td style="padding:6px 8px;vertical-align:top;border-bottom:1px solid #f0e6dc;font-size:12px">${r[h] ?? "—"}</td>`).join("")}</tr>`
  ).join("");
  return `<div style="margin-top:28px">
    <h2 style="font-size:15px;font-weight:700;color:#e8682a;border-bottom:2px solid #e8682a;padding-bottom:6px;margin:0 0 10px">${title}</h2>
    <table style="border-collapse:collapse;width:100%;font-size:13px">${head}${body}</table>
  </div>`;
}

function bKey(prefix: string, b: string) {
  return prefix + "_b_" + b.toLowerCase().replace(/[^a-zšđčćž]/g, "_").replace(/_+/g, "_");
}
function bDetKey(prefix: string, b: string) {
  return prefix + "_b_det_" + b.toLowerCase().replace(/[^a-zšđčćž]/g, "_").replace(/_+/g, "_");
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function buildHtml(d: any, t: QuestionnaireI18n, submissionLocale: Locale = "me"): string {
  const now = new Date().toLocaleString("sr-ME", { timeZone: "Europe/Podgorica" });
  const langBanner =
    submissionLocale === "me"
      ? ""
      : `<div style="background:#fef3e8;border:1px solid #f3d4ab;color:#7a4615;padding:10px 14px;border-radius:8px;margin-bottom:16px;font-size:13px">
          <strong>Napomena:</strong> Pacijent je ispunjavao upitnik na ${
            submissionLocale === "en" ? "engleskom" : "ruskom"
          } jeziku. Slobodni tekstovi su automatski prevedeni na crnogorski.
        </div>`;

  const sec1 = section(t.sections.s1, `
    <tr><td colspan="2" style="padding:4px 0;font-weight:600;color:#333">${t.groups.femalePartner}</td></tr>
    ${row(t.f.fullName, d.z_ime, t)}
    ${row(t.f.dob, d.z_dob, t)}
    ${row(t.f.passport, d.z_pasos, t)}
    ${row(t.f.email, d.z_email, t)}
    ${row(t.f.phone, d.z_telefon, t)}
    ${row(t.f.occupation, d.z_zanimanje, t)}
    <tr><td colspan="2" style="padding:10px 0 4px;font-weight:600;color:#333">${t.groups.malePartner}</td></tr>
    ${row(t.f.fullName, d.m_ime, t)}
    ${row(t.f.dob, d.m_dob, t)}
    ${row(t.f.passport, d.m_pasos, t)}
    ${row(t.f.email, d.m_email, t)}
    ${row(t.f.phone, d.m_telefon, t)}
    ${row(t.f.occupation, d.m_zanimanje, t)}
    <tr><td colspan="2" style="padding:10px 0 4px;font-weight:600;color:#333">${t.groups.asCouple}</td></tr>
    ${row(t.f.maritalStatus, d.bracni_status, t)}
    ${row(t.f.country, d.drzava, t)}
    ${row(t.f.prefComm, d.komunikacija, t)}
    ${row(t.f.mainContact, d.kontakt_osoba, t)}
  `);

  const sec2 = section(t.sections.s2, `
    ${row(t.f.relYears + " / " + t.f.relMonths, `${d.veza_godine || "—"} / ${d.veza_mjeseci || "—"}`, t)}
    ${ynRow(t.f.pregInRel, d.trudnoca_veza, d.trudnoca_veza === "da" ? `${t.f.pregCount}: ${d.trudnoca_puta || "—"} | ${t.f.pregTerm}: ${d.trudnoca_termin || "—"}` : null, t)}
    ${row(t.f.tryYears + " / " + t.f.tryMonths, `${d.pokusaj_godine || "—"} / ${d.pokusaj_mjeseci || "—"}`, t)}
    ${ynRow(t.f.diagYn, d.dijagnoza_yn, d.dijagnoza_yn === "da" ? `${t.f.diagFactor}: ${d.dijagnoza_faktor || "—"} | ${t.f.diagText}: ${d.dijagnoza_tekst || "—"} | ${t.f.diagYear}: ${d.dijagnoza_godina || "—"}` : null, t)}
    ${ynRow(t.f.artYn, d.art_veza_yn, d.art_veza_yn === "da" ? d.art_veza_detalji : null, t)}
    ${ynRow(t.f.frozenYn, d.zamrznut_yn, d.zamrznut_yn === "da" ? `${d.zamrznut_detalji || "—"} | ${t.f.frozenTransport}: ${yn(d.zamrznut_transport, t)}` : null, t)}
  `);

  const sec3a = section(t.sections.s3a, `
    ${row(t.f.age, d.z_starost ? `${d.z_starost}` : "", t)}
    ${row(t.f.height + " / " + t.f.weight, `${d.z_visina || "—"} cm / ${d.z_tezina || "—"} kg`, t)}
    ${row(t.f.bloodGroup, d.z_krv, t)}
    ${row(t.f.rhFactor, d.z_rh, t)}
    ${ynRow(t.f.fConcYn, d.z_zacece_yn, d.z_zacece_yn === "da" ? d.z_zacece_trajanje : null, t)}
  `);

  const sec3b = section(t.sections.s3b, `
    ${row(t.f.menarche, d.z_men_godina, t)}
    ${ynRow(t.f.cyclesYn, d.z_men_yn, null, t)}
    ${ynRow(t.f.cyclesRegular, d.z_ciklus_redovni, d.z_ciklus_redovni === "da" ? `${t.f.cycleDays}: ${d.z_ciklus_dani || "—"}` : `${t.f.cycleMin}: ${d.z_ciklus_min || "—"} / ${t.f.cycleMax}: ${d.z_ciklus_max || "—"}`, t)}
    ${row(t.f.bleedDays, d.z_krvarenje_dani, t)}
    ${ynRow(t.f.interBleed, d.z_medjukrvarenje, null, t)}
    ${row(t.f.bleedDesc, d.z_krvarenje_opis, t)}
    ${ynRow(t.f.painfulMens, d.z_bolne, null, t)}
    ${ynRow(t.f.heavyMens, d.z_obilne, d.z_obilne === "da" ? `${t.f.clots}: ${yn(d.z_ugruski, t)} | ${t.f.padsPerDay}: ${d.z_ulozaka || "—"}` : null, t)}
    ${ynRow(t.f.affectsLife, d.z_aktivnosti, null, t)}
    ${row(t.f.lastMens, d.z_zadnja_men, t)}
  `);

  const sec3c = section(t.sections.s3c, `
    ${ynRow(t.f.secretionYn, d.z_sekret_yn, d.z_sekret_yn === "da" ? `${t.f.secretionColor}: ${d.z_sekret_boja || "—"} | ${t.f.secretionSmell}: ${d.z_sekret_miris || "—"}` : null, t)}
    ${ynRow(t.f.bleedAfterSex, d.z_krv_odnos, null, t)}
    ${ynRow(t.f.painSex, d.z_bol_odnos, null, t)}
    ${ynRow(t.f.papaYn, d.z_papa_yn, d.z_papa_yn === "da" ? `${t.f.papaDate}: ${d.z_papa_datum || "—"} | ${t.f.papaRegular}: ${d.z_papa_uredan || "—"} | ${t.f.papaAbnorm}: ${yn(d.z_papa_abnorm, t)}` : null, t)}
    ${ynRow(t.f.cervixYn, d.z_grlić_yn, d.z_grlić_yn === "da" ? `${t.f.cervixWhen}: ${d.z_grlić_kada || "—"} | ${t.f.cervixTreatment}: ${d.z_grlić_tretman || "—"}` : null, t)}
    ${ynRow(t.f.iudYn, d.z_spirala_yn, d.z_spirala_yn === "da" ? `${t.f.iudDur}: ${d.z_spirala_trajanje || "—"} | ${t.f.iudRemoved}: ${d.z_spirala_uklonjena || "—"}` : null, t)}
    ${ynRow(t.f.ocpYn, d.z_pilula_yn, d.z_pilula_yn === "da" ? `${t.f.ocpDur}: ${d.z_pilula_trajanje || "—"} | ${t.f.ocpStopped}: ${d.z_pilula_prestanak || "—"}` : null, t)}
    ${ynRow(t.f.endometriosis, d.z_endometrioza, null, t)}
    ${ynRow(t.f.pcos, d.z_pcos, null, t)}
    ${ynRow(t.f.cysts, d.z_ciste, null, t)}
    ${ynRow(t.f.fibroids, d.z_miomi, null, t)}
    ${ynRow(t.f.polyps, d.z_polipi, null, t)}
    ${ynRow(t.f.cancer, d.z_kancer, null, t)}
    ${row(t.f.gynekDetails, d.z_ginek_detalji, t)}
    ${row(t.f.gynekOther, d.z_ginek_ostalo, t)}
  `);

  const sec3d_table = (d.z_trudnoce || []).filter((r: any) => r.datum || r.tip).length > 0
    ? tableSection(t.sections.s3d, (d.z_trudnoce || []).filter((r: any) => r.datum || r.tip).map((r: any) => ({
        [t.f.pregDate]: r.datum || "—",
        [t.f.pregPartner]: r.partner || "—",
        [t.f.pregType]: r.tip || "—",
        [t.f.pregDelivery]: r.porodjaj || "—",
        [t.f.pregOutcome]: r.ishod || "—",
        [t.f.pregNG]: r.ng || "—",
      })))
    : "";

  const sec3e = section(t.sections.s3e, `
    ${ynRow(t.f.artYesYn, d.z_art_yn, null, t)}
    ${ynRow(t.f.surrogateYn, d.z_surogat_yn, null, t)}
  `);

  const sec3e_table = (d.z_art_tretmani || []).filter((r: any) => r.datum || r.tip).length > 0
    ? tableSection(t.groups.detailsTreatments, (d.z_art_tretmani || []).filter((r: any) => r.datum || r.tip).map((r: any) => ({
        [t.f.artDate]: r.datum || "—",
        [t.f.artType]: r.tip || "—",
        [t.f.artProtocol]: r.protokol || "—",
        [t.f.artEggs]: r.jajne || "—",
        [t.f.artFert]: r.oplodene || "—",
        [t.f.artTransf]: r.transf || "—",
        [t.f.artGenetic]: r.genetski || "—",
        [t.f.artFrozen]: r.zamrznuti || "—",
        [t.f.artOutcome]: r.ishod || "—",
      })))
    : "";

  const sec3e2 = section(t.groups.fertilityCheckups, `
    ${ynRow(t.f.fertAnalysisYn, d.z_analize_yn, null, t)}
    ${row("FSH", d.z_fsh, t)}
    ${row("LH", d.z_lh, t)}
    ${row("AMH", d.z_amh, t)}
    ${row("TSH", d.z_tsh, t)}
    ${row("FT4", d.z_ft4, t)}
    ${row("UZ", d.z_uz_dojke, t)}
    ${row("UZ ginek.", d.z_uz_ginek, t)}
  `);

  const sec3f = section(t.sections.s3f, `
    ${ynRow(t.f.sexProbYn, d.z_sex_prob_yn, d.z_sex_prob_yn === "da" ? d.z_sex_prob_detalji : null, t)}
    ${ynRow(t.f.stiYn, d.z_spb_yn, d.z_spb_yn === "da" ? d.z_spb_detalji : null, t)}
    ${row(`${t.f.hepB} / ${t.f.hepC} / ${t.f.hiv} / ${t.f.syph}`, [
      d.z_hepatb === "da" ? t.f.hepB : null,
      d.z_hepatc === "da" ? t.f.hepC : null,
      d.z_hiv === "da" ? t.f.hiv : null,
      d.z_sifilis === "da" ? t.f.syph : null,
    ].filter(Boolean).join(", ") || t.email.none, t)}
    ${row(t.f.stiOther, d.z_spb_ostalo, t)}
  `);

  const sec3g_table = (d.z_lijekovi || []).filter((l: any) => l.naziv).length > 0
    ? tableSection(t.sections.s3g, (d.z_lijekovi || []).filter((l: any) => l.naziv).map((l: any) => ({
        [t.f.medName]: l.naziv || "—",
        [t.f.medDose]: l.doza || "—",
        [t.f.medFreq]: l.ucestalost || "—",
      })))
    : section(t.sections.s3g, `${ynRow(t.f.medsYn, d.z_med_yn, null, t)}`);

  const sec3h = section(t.sections.s3h, `
    ${ynRow(t.f.allergyMed, d.z_alergija_lijek, null, t)}
    ${ynRow(t.f.allergyLatex, d.z_alergija_lateks, null, t)}
    ${ynRow(t.f.allergyAnesth, d.z_alergija_anestetik, null, t)}
    ${row(t.f.allergyDetails, d.z_alergija_detalji, t)}
  `);

  const sec3i = section(t.sections.s3i, `
    ${ynRow(t.f.seriousIllYn, d.z_oboljenja_yn, d.z_oboljenja_yn === "da" ? d.z_oboljenja_detalji : null, t)}
    ${ynRow(t.f.bruisingEasily, d.z_hematom, null, t)}
    ${ynRow(t.f.bleedingStop, d.z_krvarenje_stop, null, t)}
    ${t.diseases.map(b => {
      const k = bKey("z", b);
      const dk = bDetKey("z", b);
      return ynRow(b, d[k], d[dk], t);
    }).join("")}
  `);

  const sec3j = section(t.sections.s3j, `
    ${ynRow(t.f.gynekOpYn, d.z_ginek_op_yn, null, t)}
    ${ynRow(t.f.otherOpYn, d.z_ostale_op_yn, null, t)}
  `) + ((d.z_operacije || []).filter((o: any) => o.procedura).length > 0
    ? tableSection(t.groups.operations, (d.z_operacije || []).filter((o: any) => o.procedura).map((o: any) => ({
        [t.f.opProcedure]: o.procedura || "—",
        [t.f.opDate]: o.datum || "—",
        [t.f.opReason]: o.razlog || "—",
        [t.f.opOutcome]: o.ishod || "—",
      })))
    : "");

  const sec3k = section(t.sections.s3k, `
    ${ynRow(t.f.geneticsYn, d.z_genetika_yn, d.z_genetika_yn === "da" ? d.z_genetika_detalji : null, t)}
  `);

  const sec3l = section(t.sections.s3l, `
    ${ynRow(t.f.smoker, d.z_pusac, d.z_pusac === "da" ? `${d.z_cigarete || "—"}` : null, t)}
    ${ynRow(t.f.vaping, d.z_vaping, null, t)}
    ${ynRow(t.f.drugsYn, d.z_droge_yn, d.z_droge_yn === "da" ? d.z_droge_detalji : null, t)}
    ${ynRow(t.f.alcohol, d.z_alkohol, d.z_alkohol === "da" ? `${d.z_alkohol_pica || "—"}` : null, t)}
    ${ynRow(t.f.tattoosYn, d.z_tetovaze_yn, d.z_tetovaze_yn === "da" ? d.z_tetovaze_detalji : null, t)}
    ${row(t.f.otherInfo, d.z_ostalo, t)}
  `);

  // ── MUŠKI PARTNER ──
  const sec4a = section(t.sections.s4a, `
    ${row(t.f.age, d.m_starost ? `${d.m_starost}` : "", t)}
    ${row(t.f.height + " / " + t.f.weight, `${d.m_visina || "—"} cm / ${d.m_tezina || "—"} kg`, t)}
    ${row(t.f.bloodGroup, d.m_krv, t)}
    ${row(t.f.rhFactor, d.m_rh, t)}
  `);

  const sec4b = section(t.sections.s4b, `
    ${ynRow(t.f.mPregYn, d.m_trudnoca_yn, d.m_trudnoca_yn === "da" ? d.m_trudnoca_detalji : null, t)}
    ${ynRow(t.f.mOtherPregYn, d.m_druga_yn, d.m_druga_yn === "da" ? d.m_druga_detalji : null, t)}
    ${ynRow(t.f.klomidYn, d.m_klomid_yn, d.m_klomid_yn === "da" ? d.m_klomid_trajanje : null, t)}
    ${ynRow(t.f.mArtYn, d.m_art_yn, d.m_art_yn === "da" ? d.m_art_detalji : null, t)}
    ${ynRow(t.f.erectionYn, d.m_erekcija_yn, d.m_erekcija_yn === "da" ? d.m_erekcija_detalji : null, t)}
    ${ynRow(t.f.testesYn, d.m_testisi_yn, d.m_testisi_yn === "da" ? d.m_testisi_detalji : null, t)}
    ${ynRow(t.f.mumpsYn, d.m_zauske_yn, d.m_zauske_yn === "da" ? d.m_zauske_uticaj : null, t)}
    ${row(t.f.pubertyAge, d.m_pubertet, t)}
    ${ynRow(t.f.saunaYn, d.m_sauna_yn, d.m_sauna_yn === "da" ? d.m_sauna_detalji : null, t)}
    ${ynRow(t.f.feverYn, d.m_groznica_yn, d.m_groznica_yn === "da" ? d.m_groznica_detalji : null, t)}
    ${ynRow(t.f.steroidsYn, d.m_steroidi_yn, d.m_steroidi_yn === "da" ? d.m_steroidi_detalji : null, t)}
  `);

  const sec4c = section(t.sections.s4c, `
    ${row(t.f.sexFreq, d.m_sex_ucestalost, t)}
    ${ynRow(t.f.stiYn, d.m_spb_yn, d.m_spb_yn === "da" ? d.m_spb_detalji : null, t)}
    ${row(`${t.f.hepB} / ${t.f.hepC} / ${t.f.hiv} / ${t.f.syph}`, [
      d.m_hepatb === "da" ? t.f.hepB : null,
      d.m_hepatc === "da" ? t.f.hepC : null,
      d.m_hiv === "da" ? t.f.hiv : null,
      d.m_sifilis === "da" ? t.f.syph : null,
    ].filter(Boolean).join(", ") || t.email.none, t)}
    ${row(t.f.stiOther, d.m_spb_ostalo, t)}
  `);

  const sec4d_table = (d.m_lijekovi || []).filter((l: any) => l.naziv).length > 0
    ? tableSection(t.sections.s4d, (d.m_lijekovi || []).filter((l: any) => l.naziv).map((l: any) => ({
        [t.f.medName]: l.naziv || "—",
        [t.f.medDose]: l.doza || "—",
        [t.f.medFreq]: l.ucestalost || "—",
      })))
    : section(t.sections.s4d, `${ynRow(t.f.medsYn, d.m_med_yn, null, t)}`);

  const sec4e = section(t.sections.s4e, `
    ${ynRow(t.f.allergyMed, d.m_alergija_lijek, null, t)}
    ${ynRow(t.f.allergyLatex, d.m_alergija_lateks, null, t)}
    ${ynRow(t.f.allergyAnesth, d.m_alergija_anestetik, null, t)}
    ${row(t.f.allergyDetails, d.m_alergija_detalji, t)}
  `);

  const sec4f = section(t.sections.s4f, `
    ${ynRow(t.f.seriousIllYn, d.m_oboljenja_yn, d.m_oboljenja_yn === "da" ? d.m_oboljenja_detalji : null, t)}
    ${ynRow(t.f.bruisingEasily, d.m_hematom, null, t)}
    ${ynRow(t.f.bleedingStop, d.m_krvarenje_stop, null, t)}
    ${t.diseases.map(b => {
      const k = bKey("m", b);
      const dk = bDetKey("m", b);
      return ynRow(b, d[k], d[dk], t);
    }).join("")}
    ${ynRow(t.f.mSurgeryYn, d.m_op_yn, null, t)}
  `) + ((d.m_operacije || []).filter((o: any) => o.procedura).length > 0
    ? tableSection(t.groups.operations, (d.m_operacije || []).filter((o: any) => o.procedura).map((o: any) => ({
        [t.f.opProcedure]: o.procedura || "—",
        [t.f.opDate]: o.datum || "—",
        [t.f.opReason]: o.razlog || "—",
        [t.f.opOutcome]: o.ishod || "—",
      })))
    : "");

  const sec4g = section(t.sections.s4g, `
    ${ynRow(t.f.smoker, d.m_pusac, d.m_pusac === "da" ? `${d.m_cigarete || "—"}` : null, t)}
    ${ynRow(t.f.vaping, d.m_vaping, null, t)}
    ${ynRow(t.f.mDrugsYn, d.m_droge_yn, d.m_droge_yn === "da" ? d.m_droge_detalji : null, t)}
    ${ynRow(t.f.alcohol, d.m_alkohol, d.m_alkohol === "da" ? `${d.m_alkohol_pica || "—"}` : null, t)}
    ${row(t.f.otherInfo, d.m_ostalo, t)}
  `);

  return `<!DOCTYPE html><html lang="sr"><head><meta charset="utf-8">
  <title>${t.email.emailTitle} — ${esc(d.z_ime, "")}</title></head>
  <body style="font-family:Arial,sans-serif;max-width:820px;margin:0 auto;padding:20px;color:#1a1a1a;background:#fff">
    <div style="background:#e8682a;color:#fff;padding:18px 24px;border-radius:8px;margin-bottom:20px">
      <h1 style="margin:0;font-size:18px">${t.email.emailTitle}</h1>
      <p style="margin:6px 0 0;font-size:13px;opacity:0.85">${t.email.receivedAt} ${now}</p>
    </div>
    ${langBanner}
    ${sec1}${sec2}${sec3a}${sec3b}${sec3c}${sec3d_table}${sec3e}${sec3e_table}${sec3e2}${sec3f}
    ${sec3g_table}${sec3h}${sec3i}${sec3j}${sec3k}${sec3l}
    ${sec4a}${sec4b}${sec4c}${sec4d_table}${sec4e}${sec4f}${sec4g}
    <hr style="margin-top:32px;border:1px solid #f0e6dc">
    <p style="font-size:11px;color:#999;margin-top:8px">${t.email.autoGenerated}</p>
  </body></html>`;
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

  // Ako je pacijent ispunjavao na EN/RU → prevedi slobodne tekstove na crnogorski
  if (submissionLocale === "en" || submissionLocale === "ru") {
    if (isFormPatientTranslationEnabled()) {
      await translatePatientData(data, submissionLocale);
    } else {
      console.warn("[upitnik] patient translation not enabled — sending original text in", submissionLocale);
    }
  }

  // Email klinici je UVIJEK na crnogorskom (labelama i sadržajem)
  const t = getQuestionnaireI18n(STAFF_EMAIL_LOCALE);

  const femaleEmail = String(data.z_email || "").trim();
  const femaleName = String(data.z_ime || "Pacijent").trim();

  const langTag =
    submissionLocale === "en" ? " · ispunjen na engleskom"
    : submissionLocale === "ru" ? " · ispunjen na ruskom"
    : "";

  const html = buildHtml(data, t, submissionLocale);
  const subject = `${t.email.subjectPrefix} ${femaleName} — ${new Date().toLocaleDateString("sr-ME")}${langTag}`;

  const toClinic = process.env.UPITNIK_NOTIFY_EMAIL?.trim() || DEFAULT_NOTIFY_INBOX;

  const result = await sendResendEmail({
    to: toClinic,
    subject,
    text: `Primljen upitnik od: ${femaleName} (${femaleEmail || "—"}). Pogledajte HTML verziju.`,
    html,
    replyTo: femaleEmail || undefined,
    logPrefix: "[upitnik]",
  });

  if (!result.ok) {
    console.error("[upitnik] send failed", result);
    return NextResponse.json({ ok: false, error: "email_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
