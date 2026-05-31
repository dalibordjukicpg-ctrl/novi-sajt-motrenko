import mysql from "mysql2/promise";

import { getDatabaseUrl } from "@/lib/database-url";
import { generateOtpCode, hashOtpCode } from "@/lib/auth/otp-challenge";
import {
  getTranslateProvider,
  isFormPatientTranslationEnabled,
} from "@/lib/machine-translate";
import { generateBookingPdf } from "@/lib/pdf/generate-booking-pdf";
import { getBookingStaffDocumentLabels } from "@/lib/booking/intake-labels";

const OTP_TABLES = [
  "admin_login_otp_challenges",
  "admin_login_otp_sends",
  "admin_trusted_devices",
] as const;

async function main() {
  const issues: string[] = [];
  const ok: string[] = [];

  console.log("=== Provjera admin OTP + forme (lokalno) ===\n");

  // Env
  const resend = process.env.RESEND_API_KEY?.trim();
  if (resend) ok.push("RESEND_API_KEY postavljen (OTP email na produkciji)");
  else
    issues.push(
      "RESEND_API_KEY nije u .env — OTP email se preskače u dev-u (kod u konzoli)",
    );

  if (isFormPatientTranslationEnabled()) {
    ok.push(`Prevod PDF forme: ${getTranslateProvider() ?? "?"}`);
  } else {
    issues.push("Prevod teksta pacijenta u PDF-u nije aktivan (TRANSLATE_PROVIDER/API)");
  }

  // DB
  const url = getDatabaseUrl();
  const conn = await mysql.createConnection(url);
  try {
    for (const table of OTP_TABLES) {
      const [rows] = await conn.query<mysql.RowDataPacket[]>(
        `SELECT 1 AS ok FROM information_schema.tables
         WHERE table_schema = DATABASE() AND table_name = ? LIMIT 1`,
        [table],
      );
      if (rows.length) ok.push(`Tabela ${table} postoji`);
      else issues.push(`Tabela ${table} NEDOSTAJE — pokreni ensure-admin-login-otp ili SQL 0021`);
    }

    const [admins] = await conn.query<mysql.RowDataPacket[]>(
      `SELECT id, email, role, is_active FROM users
       WHERE role IN ('SUPER_ADMIN','ADMIN','STAFF') AND is_active = 1 LIMIT 5`,
    );
    if (admins.length === 0) {
      issues.push("Nema aktivnih admin korisnika u bazi");
    } else {
      ok.push(
        `Admin nalozi (${admins.length}): ${admins.map((a) => a.email).join(", ")}`,
      );
    }

    // Simulacija OTP inserta (rollback)
    await conn.beginTransaction();
    const challengeId = "00000000-0000-4000-8000-000000000099";
    const testUserId = admins[0]?.id as string | undefined;
    if (testUserId) {
      const code = generateOtpCode();
      const otpHash = hashOtpCode(challengeId, code);
      await conn.query(
        `INSERT INTO admin_login_otp_challenges
         (id, user_id, secret_hash, otp_hash, otp_expires_at, wrong_attempts, redirect_to, created_at)
         VALUES (?, ?, ?, ?, DATE_ADD(NOW(3), INTERVAL 10 MINUTE), 0, '/test', NOW(3))`,
        [challengeId, testUserId, "a".repeat(64), otpHash],
      );
      await conn.query(`DELETE FROM admin_login_otp_challenges WHERE id = ?`, [
        challengeId,
      ]);
      ok.push("OTP insert/delete test u bazi — OK");
    }
    await conn.rollback();
  } finally {
    await conn.end();
  }

  // PDF
  const labels = getBookingStaffDocumentLabels();
  const pdf = await generateBookingPdf(
    {
      submittedAt: new Date(),
      publicRef: "VERIFY01",
      data: {
        locale: "me",
        fullName: "Test",
        email: "t@t.com",
        phone: "+38267123456",
        dateOfBirth: "",
        whoAttends: "patient_only",
        whatBroughtYou: "Kratki test razlog dolaska.",
        tryingConceiveDuration: "lt_6m",
        consentAccepted: true,
      },
      labels,
    },
    {
      clinicName: "HRC",
      clinicEmail: "info@humanreproduction.com",
      clinicWeb: "https://humanreproduction.com",
    },
  );
  if (pdf.length > 5000) ok.push(`PDF prijavnica generisan (${pdf.length} bajtova)`);
  else issues.push("PDF prijavnica premala — provjeri pdf-fonts");

  console.log("OK:");
  for (const line of ok) console.log("  ✓", line);
  if (issues.length) {
    console.log("\nUPOZORENJA / PROBLEMI:");
    for (const line of issues) console.log("  !", line);
  }
  console.log("\n=== Produkcija (Hostinger) ===");
  console.log("  1. phpMyAdmin: pokreni drizzle/0021_admin_login_otp.sql (ako tabele fale)");
  console.log("  2. Env: RESEND_API_KEY + RESEND_FROM (OTP email)");
  console.log("  3. Redeploy + restart (ensure-admin-login-otp pri startu)");
  console.log(
    issues.some((i) => i.includes("NEDOSTAJE"))
      ? "\nSTATUS: NE SPREMNO — popuni bazu"
      : issues.length
        ? "\nSTATUS: OK lokalno, provjeri env na produkciji"
        : "\nSTATUS: Sve provjere prošle",
  );
}

main().catch((e) => {
  console.error("FATAL:", e instanceof Error ? e.message : e);
  process.exit(1);
});
