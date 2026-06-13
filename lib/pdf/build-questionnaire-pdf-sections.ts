import type { Locale } from "@/lib/i18n";
import type { QuestionnaireI18n } from "@/lib/questionnaire-i18n";
import type { PdfFieldRow, PdfSection } from "@/lib/pdf/pdf-layout";
import { truncateForPdf } from "@/lib/pdf/pdf-filenames";

type D = Record<string, unknown>;

function str(v: unknown): string {
  if (v == null || v === "") return "—";
  return String(v).trim() || "—";
}

function yn(v: unknown, t: QuestionnaireI18n): string {
  if (v === "da") return t.ui.yes;
  if (v === "ne") return t.ui.no;
  return "—";
}

function pair(label: string, value: unknown): PdfFieldRow {
  return { kind: "pair", label, value: str(value) };
}

function ynPair(
  label: string,
  value: unknown,
  detail: unknown,
  t: QuestionnaireI18n,
): PdfFieldRow {
  const base = yn(value, t);
  const det = detail != null && String(detail).trim() ? String(detail).trim() : "";
  return pair(label, det ? `${base} — ${det}` : base);
}

function group(label: string): PdfFieldRow {
  return { kind: "block", label, value: " ", flex: 0.2 };
}

function tableFields(
  title: string,
  rows: Record<string, string>[],
): PdfFieldRow[] {
  if (rows.length === 0) return [];
  return rows.map((row, i) => ({
    kind: "block" as const,
    label: `${title} #${i + 1}`,
    value: truncateForPdf(
      Object.entries(row)
        .map(([k, v]) => `${k}: ${v}`)
        .join("\n"),
      1200,
    ),
  }));
}

function bKey(prefix: string, b: string): string {
  return `${prefix}_b_${b.toLowerCase().replace(/[^a-zšđčćž]/g, "_").replace(/_+/g, "_")}`;
}

function bDetKey(prefix: string, b: string): string {
  return `${prefix}_b_det_${b.toLowerCase().replace(/[^a-zšđčćž]/g, "_").replace(/_+/g, "_")}`;
}

function rowsFromTable(
  items: unknown[],
  mapper: (row: Record<string, unknown>) => Record<string, string> | null,
): Record<string, string>[] {
  const out: Record<string, string>[] = [];
  for (const item of items) {
    if (!item || typeof item !== "object") continue;
    const mapped = mapper(item as Record<string, unknown>);
    if (mapped) out.push(mapped);
  }
  return out;
}

/** PDF sekcije za kliniku — uvijek na crnogorskom (t = ME i18n). */
export function buildQuestionnairePdfSections(
  d: D,
  t: QuestionnaireI18n,
): PdfSection[] {
  let idx = 0;
  const next = (title: string, fields: PdfFieldRow[]): PdfSection => ({
    index: ++idx,
    title,
    fields,
  });

  const sections: PdfSection[] = [];

  sections.push(
    next(t.sections.s1, [
      group(t.groups.femalePartner),
      pair(t.f.fullName, d.z_ime),
      pair(t.f.dob, d.z_dob),
      pair(t.f.passport, d.z_pasos),
      pair(t.f.email, d.z_email),
      pair(t.f.phone, d.z_telefon),
      pair(t.f.occupation, d.z_zanimanje),
      group(t.groups.malePartner),
      pair(t.f.fullName, d.m_ime),
      pair(t.f.dob, d.m_dob),
      pair(t.f.passport, d.m_pasos),
      pair(t.f.email, d.m_email),
      pair(t.f.phone, d.m_telefon),
      pair(t.f.occupation, d.m_zanimanje),
      group(t.groups.asCouple),
      pair(t.f.maritalStatus, d.bracni_status),
      pair(t.f.country, d.drzava),
      pair(t.f.prefComm, d.komunikacija),
      pair(t.f.mainContact, d.kontakt_osoba),
    ]),
  );

  sections.push(
    next(t.sections.s2, [
      pair(`${t.f.relYears} / ${t.f.relMonths}`, `${str(d.veza_godine)} / ${str(d.veza_mjeseci)}`),
      ynPair(
        t.f.pregInRel,
        d.trudnoca_veza,
        d.trudnoca_veza === "da"
          ? `${t.f.pregCount}: ${str(d.trudnoca_puta)} | ${t.f.pregTerm}: ${str(d.trudnoca_termin)}`
          : null,
        t,
      ),
      pair(`${t.f.tryYears} / ${t.f.tryMonths}`, `${str(d.pokusaj_godine)} / ${str(d.pokusaj_mjeseci)}`),
      ynPair(
        t.f.diagYn,
        d.dijagnoza_yn,
        d.dijagnoza_yn === "da"
          ? `${t.f.diagFactor}: ${str(d.dijagnoza_faktor)} | ${t.f.diagText}: ${str(d.dijagnoza_tekst)} | ${t.f.diagYear}: ${str(d.dijagnoza_godina)}`
          : null,
        t,
      ),
      ynPair(t.f.artYn, d.art_veza_yn, d.art_veza_yn === "da" ? d.art_veza_detalji : null, t),
      ynPair(
        t.f.frozenYn,
        d.zamrznut_yn,
        d.zamrznut_yn === "da"
          ? `${str(d.zamrznut_detalji)} | ${t.f.frozenTransport}: ${yn(d.zamrznut_transport, t)}`
          : null,
        t,
      ),
    ]),
  );

  sections.push(
    next(t.sections.s3a, [
      pair(t.f.age, d.z_starost),
      pair(`${t.f.height} / ${t.f.weight}`, `${str(d.z_visina)} cm / ${str(d.z_tezina)} kg`),
      pair(t.f.bloodGroup, d.z_krv),
      pair(t.f.rhFactor, d.z_rh),
      ynPair(t.f.fConcYn, d.z_zacece_yn, d.z_zacece_yn === "da" ? d.z_zacece_trajanje : null, t),
    ]),
  );

  sections.push(
    next(t.sections.s3b, [
      pair(t.f.menarche, d.z_men_godina),
      ynPair(t.f.cyclesYn, d.z_men_yn, null, t),
      ynPair(
        t.f.cyclesRegular,
        d.z_ciklus_redovni,
        d.z_ciklus_redovni === "da"
          ? `${t.f.cycleDays}: ${str(d.z_ciklus_dani)}`
          : `${t.f.cycleMin}: ${str(d.z_ciklus_min)} / ${t.f.cycleMax}: ${str(d.z_ciklus_max)}`,
        t,
      ),
      pair(t.f.bleedDays, d.z_krvarenje_dani),
      ynPair(t.f.interBleed, d.z_medjukrvarenje, null, t),
      pair(t.f.bleedDesc, d.z_krvarenje_opis),
      ynPair(t.f.painfulMens, d.z_bolne, null, t),
      ynPair(
        t.f.heavyMens,
        d.z_obilne,
        d.z_obilne === "da"
          ? `${t.f.clots}: ${yn(d.z_ugruski, t)} | ${t.f.padsPerDay}: ${str(d.z_ulozaka)}`
          : null,
        t,
      ),
      ynPair(t.f.affectsLife, d.z_aktivnosti, null, t),
      pair(t.f.lastMens, d.z_zadnja_men),
    ]),
  );

  sections.push(
    next(t.sections.s3c, [
      ynPair(
        t.f.secretionYn,
        d.z_sekret_yn,
        d.z_sekret_yn === "da"
          ? `${t.f.secretionColor}: ${str(d.z_sekret_boja)} | ${t.f.secretionSmell}: ${str(d.z_sekret_miris)}`
          : null,
        t,
      ),
      ynPair(t.f.bleedAfterSex, d.z_krv_odnos, null, t),
      ynPair(t.f.painSex, d.z_bol_odnos, null, t),
      ynPair(
        t.f.papaYn,
        d.z_papa_yn,
        d.z_papa_yn === "da"
          ? `${t.f.papaDate}: ${str(d.z_papa_datum)} | ${t.f.papaRegular}: ${str(d.z_papa_uredan)} | ${t.f.papaAbnorm}: ${yn(d.z_papa_abnorm, t)}`
          : null,
        t,
      ),
      ynPair(
        t.f.cervixYn,
        d.z_grlić_yn,
        d.z_grlić_yn === "da"
          ? `${t.f.cervixWhen}: ${str(d.z_grlić_kada)} | ${t.f.cervixTreatment}: ${str(d.z_grlić_tretman)}`
          : null,
        t,
      ),
      ynPair(
        t.f.iudYn,
        d.z_spirala_yn,
        d.z_spirala_yn === "da"
          ? `${t.f.iudDur}: ${str(d.z_spirala_trajanje)} | ${t.f.iudRemoved}: ${str(d.z_spirala_uklonjena)}`
          : null,
        t,
      ),
      ynPair(
        t.f.ocpYn,
        d.z_pilula_yn,
        d.z_pilula_yn === "da"
          ? `${t.f.ocpDur}: ${str(d.z_pilula_trajanje)} | ${t.f.ocpStopped}: ${str(d.z_pilula_prestanak)}`
          : null,
        t,
      ),
      ynPair(t.f.endometriosis, d.z_endometrioza, null, t),
      ynPair(t.f.pcos, d.z_pcos, null, t),
      ynPair(t.f.cysts, d.z_ciste, null, t),
      ynPair(t.f.fibroids, d.z_miomi, null, t),
      ynPair(t.f.polyps, d.z_polipi, null, t),
      ynPair(t.f.cancer, d.z_kancer, null, t),
      pair(t.f.gynekDetails, d.z_ginek_detalji),
      pair(t.f.gynekOther, d.z_ginek_ostalo),
    ]),
  );

  const pregRows = rowsFromTable(Array.isArray(d.z_trudnoce) ? d.z_trudnoce : [], (r) =>
    r.datum || r.tip
      ? {
          [t.f.pregDate]: str(r.datum),
          [t.f.pregPartner]: str(r.partner),
          [t.f.pregType]: str(r.tip),
          [t.f.pregDelivery]: str(r.porodjaj),
          [t.f.pregOutcome]: str(r.ishod),
          [t.f.pregNG]: str(r.ng),
        }
      : null,
  );
  if (pregRows.length > 0) {
    sections.push(next(t.sections.s3d, tableFields(t.sections.s3d, pregRows)));
  }

  sections.push(
    next(t.sections.s3e, [
      ynPair(t.f.artYesYn, d.z_art_yn, null, t),
      ynPair(t.f.surrogateYn, d.z_surogat_yn, null, t),
    ]),
  );

  const artRows = rowsFromTable(Array.isArray(d.z_art_tretmani) ? d.z_art_tretmani : [], (r) =>
    r.datum || r.tip
      ? {
          [t.f.artDate]: str(r.datum),
          [t.f.artType]: str(r.tip),
          [t.f.artProtocol]: str(r.protokol),
          [t.f.artEggs]: str(r.jajne),
          [t.f.artFert]: str(r.oplodene),
          [t.f.artTransf]: str(r.transf),
          [t.f.artGenetic]: str(r.genetski),
          [t.f.artFrozen]: str(r.zamrznuti),
          [t.f.artOutcome]: str(r.ishod),
        }
      : null,
  );
  if (artRows.length > 0) {
    sections.push(next(t.groups.detailsTreatments, tableFields(t.groups.detailsTreatments, artRows)));
  }

  sections.push(
    next(t.groups.fertilityCheckups, [
      ynPair(t.f.fertAnalysisYn, d.z_analize_yn, null, t),
      pair("FSH", d.z_fsh),
      pair("LH", d.z_lh),
      pair("AMH", d.z_amh),
      pair("TSH", d.z_tsh),
      pair("FT4", d.z_ft4),
      pair("UZ", d.z_uz_dojke),
      pair("UZ ginek.", d.z_uz_ginek),
    ]),
  );

  sections.push(
    next(t.sections.s3f, [
      ynPair(t.f.sexProbYn, d.z_sex_prob_yn, d.z_sex_prob_yn === "da" ? d.z_sex_prob_detalji : null, t),
      ynPair(t.f.stiYn, d.z_spb_yn, d.z_spb_yn === "da" ? d.z_spb_detalji : null, t),
      pair(
        `${t.f.hepB} / ${t.f.hepC} / ${t.f.hiv} / ${t.f.syph}`,
        [
          d.z_hepatb === "da" ? t.f.hepB : null,
          d.z_hepatc === "da" ? t.f.hepC : null,
          d.z_hiv === "da" ? t.f.hiv : null,
          d.z_sifilis === "da" ? t.f.syph : null,
        ]
          .filter(Boolean)
          .join(", ") || t.email.none,
      ),
      pair(t.f.stiOther, d.z_spb_ostalo),
    ]),
  );

  const medRows = rowsFromTable(Array.isArray(d.z_lijekovi) ? d.z_lijekovi : [], (r) =>
    r.naziv
      ? {
          [t.f.medName]: str(r.naziv),
          [t.f.medDose]: str(r.doza),
          [t.f.medFreq]: str(r.ucestalost),
        }
      : null,
  );
  if (medRows.length > 0) {
    sections.push(next(t.sections.s3g, tableFields(t.sections.s3g, medRows)));
  } else {
    sections.push(next(t.sections.s3g, [ynPair(t.f.medsYn, d.z_med_yn, null, t)]));
  }

  sections.push(
    next(t.sections.s3h, [
      ynPair(t.f.allergyMed, d.z_alergija_lijek, null, t),
      ynPair(t.f.allergyLatex, d.z_alergija_lateks, null, t),
      ynPair(t.f.allergyAnesth, d.z_alergija_anestetik, null, t),
      pair(t.f.allergyDetails, d.z_alergija_detalji),
    ]),
  );

  const diseaseFields: PdfFieldRow[] = [
    ynPair(
      t.f.seriousIllYn,
      d.z_oboljenja_yn,
      d.z_oboljenja_yn === "da" ? d.z_oboljenja_detalji : null,
      t,
    ),
    ynPair(t.f.bruisingEasily, d.z_hematom, null, t),
    ynPair(t.f.bleedingStop, d.z_krvarenje_stop, null, t),
    ...t.diseases.map((b) => {
      const k = bKey("z", b);
      const dk = bDetKey("z", b);
      return ynPair(b, d[k], d[dk], t);
    }),
  ];
  sections.push(next(t.sections.s3i, diseaseFields));

  const opRows = rowsFromTable(Array.isArray(d.z_operacije) ? d.z_operacije : [], (r) =>
    r.procedura
      ? {
          [t.f.opProcedure]: str(r.procedura),
          [t.f.opDate]: str(r.datum),
          [t.f.opReason]: str(r.razlog),
          [t.f.opOutcome]: str(r.ishod),
        }
      : null,
  );
  sections.push(
    next(t.sections.s3j, [
      ynPair(t.f.gynekOpYn, d.z_ginek_op_yn, null, t),
      ynPair(t.f.otherOpYn, d.z_ostale_op_yn, null, t),
      ...tableFields(t.groups.operations, opRows),
    ]),
  );

  sections.push(
    next(t.sections.s3k, [
      ynPair(t.f.geneticsYn, d.z_genetika_yn, d.z_genetika_yn === "da" ? d.z_genetika_detalji : null, t),
    ]),
  );

  sections.push(
    next(t.sections.s3l, [
      ynPair(t.f.smoker, d.z_pusac, d.z_pusac === "da" ? d.z_cigarete : null, t),
      ynPair(t.f.vaping, d.z_vaping, null, t),
      ynPair(t.f.drugsYn, d.z_droge_yn, d.z_droge_yn === "da" ? d.z_droge_detalji : null, t),
      ynPair(t.f.alcohol, d.z_alkohol, d.z_alkohol === "da" ? d.z_alkohol_pica : null, t),
      ynPair(t.f.tattoosYn, d.z_tetovaze_yn, d.z_tetovaze_yn === "da" ? d.z_tetovaze_detalji : null, t),
      pair(t.f.otherInfo, d.z_ostalo),
    ]),
  );

  sections.push(
    next(t.sections.s4a, [
      pair(t.f.age, d.m_starost),
      pair(`${t.f.height} / ${t.f.weight}`, `${str(d.m_visina)} cm / ${str(d.m_tezina)} kg`),
      pair(t.f.bloodGroup, d.m_krv),
      pair(t.f.rhFactor, d.m_rh),
    ]),
  );

  sections.push(
    next(t.sections.s4b, [
      ynPair(t.f.mPregYn, d.m_trudnoca_yn, d.m_trudnoca_yn === "da" ? d.m_trudnoca_detalji : null, t),
      ynPair(t.f.mOtherPregYn, d.m_druga_yn, d.m_druga_yn === "da" ? d.m_druga_detalji : null, t),
      ynPair(t.f.klomidYn, d.m_klomid_yn, d.m_klomid_yn === "da" ? d.m_klomid_trajanje : null, t),
      ynPair(t.f.mArtYn, d.m_art_yn, d.m_art_yn === "da" ? d.m_art_detalji : null, t),
      ynPair(t.f.erectionYn, d.m_erekcija_yn, d.m_erekcija_yn === "da" ? d.m_erekcija_detalji : null, t),
      ynPair(t.f.testesYn, d.m_testisi_yn, d.m_testisi_yn === "da" ? d.m_testisi_detalji : null, t),
      ynPair(t.f.mumpsYn, d.m_zauske_yn, d.m_zauske_yn === "da" ? d.m_zauske_uticaj : null, t),
      pair(t.f.pubertyAge, d.m_pubertet),
      ynPair(t.f.saunaYn, d.m_sauna_yn, d.m_sauna_yn === "da" ? d.m_sauna_detalji : null, t),
      ynPair(t.f.feverYn, d.m_groznica_yn, d.m_groznica_yn === "da" ? d.m_groznica_detalji : null, t),
      ynPair(t.f.steroidsYn, d.m_steroidi_yn, d.m_steroidi_yn === "da" ? d.m_steroidi_detalji : null, t),
    ]),
  );

  sections.push(
    next(t.sections.s4c, [
      pair(t.f.sexFreq, d.m_sex_ucestalost),
      ynPair(t.f.stiYn, d.m_spb_yn, d.m_spb_yn === "da" ? d.m_spb_detalji : null, t),
      pair(
        `${t.f.hepB} / ${t.f.hepC} / ${t.f.hiv} / ${t.f.syph}`,
        [
          d.m_hepatb === "da" ? t.f.hepB : null,
          d.m_hepatc === "da" ? t.f.hepC : null,
          d.m_hiv === "da" ? t.f.hiv : null,
          d.m_sifilis === "da" ? t.f.syph : null,
        ]
          .filter(Boolean)
          .join(", ") || t.email.none,
      ),
      pair(t.f.stiOther, d.m_spb_ostalo),
    ]),
  );

  const mMedRows = rowsFromTable(Array.isArray(d.m_lijekovi) ? d.m_lijekovi : [], (r) =>
    r.naziv
      ? {
          [t.f.medName]: str(r.naziv),
          [t.f.medDose]: str(r.doza),
          [t.f.medFreq]: str(r.ucestalost),
        }
      : null,
  );
  if (mMedRows.length > 0) {
    sections.push(next(t.sections.s4d, tableFields(t.sections.s4d, mMedRows)));
  } else {
    sections.push(next(t.sections.s4d, [ynPair(t.f.medsYn, d.m_med_yn, null, t)]));
  }

  sections.push(
    next(t.sections.s4e, [
      ynPair(t.f.allergyMed, d.m_alergija_lijek, null, t),
      ynPair(t.f.allergyLatex, d.m_alergija_lateks, null, t),
      ynPair(t.f.allergyAnesth, d.m_alergija_anestetik, null, t),
      pair(t.f.allergyDetails, d.m_alergija_detalji),
    ]),
  );

  const mOpRows = rowsFromTable(Array.isArray(d.m_operacije) ? d.m_operacije : [], (r) =>
    r.procedura
      ? {
          [t.f.opProcedure]: str(r.procedura),
          [t.f.opDate]: str(r.datum),
          [t.f.opReason]: str(r.razlog),
          [t.f.opOutcome]: str(r.ishod),
        }
      : null,
  );
  sections.push(
    next(t.sections.s4f, [
      ynPair(t.f.seriousIllYn, d.m_oboljenja_yn, d.m_oboljenja_yn === "da" ? d.m_oboljenja_detalji : null, t),
      ynPair(t.f.bruisingEasily, d.m_hematom, null, t),
      ynPair(t.f.bleedingStop, d.m_krvarenje_stop, null, t),
      ...t.diseases.map((b) => {
        const k = bKey("m", b);
        const dk = bDetKey("m", b);
        return ynPair(b, d[k], d[dk], t);
      }),
      ynPair(t.f.mSurgeryYn, d.m_op_yn, null, t),
      ...tableFields(t.groups.operations, mOpRows),
    ]),
  );

  sections.push(
    next(t.sections.s4g, [
      ynPair(t.f.smoker, d.m_pusac, d.m_pusac === "da" ? d.m_cigarete : null, t),
      ynPair(t.f.vaping, d.m_vaping, null, t),
      ynPair(t.f.mDrugsYn, d.m_droge_yn, d.m_droge_yn === "da" ? d.m_droge_detalji : null, t),
      ynPair(t.f.alcohol, d.m_alkohol, d.m_alkohol === "da" ? d.m_alkohol_pica : null, t),
      pair(t.f.otherInfo, d.m_ostalo),
    ]),
  );

  return sections;
}

export function questionnairePdfMetaLabels(t: QuestionnaireI18n): {
  submittedAt: string;
  formLanguage: string;
} {
  return {
    submittedAt: "Datum slanja",
    formLanguage: "Jezik forme (ispunjeno)",
  };
}

export function questionnaireFilledLanguageNote(
  submissionLocale: Locale,
): string | undefined {
  if (submissionLocale === "me") return undefined;
  return `Pacijent je ispunjavao upitnik na ${submissionLocale === "en" ? "engleskom" : "ruskom"} jeziku. Slobodni tekstovi su prevedeni na crnogorski.`;
}
