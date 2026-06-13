/**
 * Resend env — čitanje u runtime (bez Next.js build-time inlining-a).
 * Na Hostingeru RESEND_API_KEY postoji tek pri `npm start`, ne u build fazi.
 */

export type ResendEnvStatus = {
  apiKeyConfigured: boolean;
  apiKeyPrefix: string | null;
  fromConfigured: boolean;
  fromDomain: string | null;
};

export function getResendApiKey(): string {
  return String(process.env["RESEND_API_KEY"] ?? "").trim();
}

export function getResendFrom(): string {
  const from = String(process.env["RESEND_FROM"] ?? "").trim();
  return from || "Auth <onboarding@resend.dev>";
}

export function getResendEnvStatus(): ResendEnvStatus {
  const key = getResendApiKey();
  const from = String(process.env["RESEND_FROM"] ?? "").trim();
  return {
    apiKeyConfigured: key.length > 0,
    apiKeyPrefix: key ? `${key.slice(0, 6)}…` : null,
    fromConfigured: from.length > 0,
    fromDomain: from.match(/@([^>]+)>?$/i)?.[1] ?? null,
  };
}
