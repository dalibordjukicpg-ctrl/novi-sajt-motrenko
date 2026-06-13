/** Normalizuj link upitnika u URL pogodan za iframe embed. */
export function normalizeQuestionnaireEmbedUrl(
  raw: string | null | undefined,
): string | null {
  const url = raw?.trim();
  if (!url) return null;

  try {
    const u = new URL(url);

    if (u.hostname.includes("docs.google.com") && u.pathname.includes("/forms/")) {
      const match = u.pathname.match(/\/forms\/d\/e\/([^/]+)/);
      if (match?.[1]) {
        return `https://docs.google.com/forms/d/e/${match[1]}/viewform?embedded=true`;
      }
    }

    if (
      u.hostname.includes("forms.office.com") ||
      u.hostname.includes("forms.cloud.microsoft")
    ) {
      if (!u.searchParams.has("embed")) {
        u.searchParams.set("embed", "true");
      }
      return u.toString();
    }

    if (u.hostname.includes("typeform.com")) {
      return u.toString();
    }

    if (u.protocol === "http:" || u.protocol === "https:") {
      return u.toString();
    }
  } catch {
    return null;
  }

  return null;
}
