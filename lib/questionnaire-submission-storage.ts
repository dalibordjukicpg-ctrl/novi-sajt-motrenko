import fs from "fs";
import path from "path";

function candidateRoots(): string[] {
  const env = process.env.QUESTIONNAIRE_PDFS_DIR?.trim();
  if (env) {
    return [path.isAbsolute(env) ? env : path.join(process.cwd(), env)];
  }
  if (process.env.NODE_ENV === "production") {
    return [
      path.join(process.cwd(), "..", "private", "questionnaire-pdfs"),
      path.join(process.cwd(), "var", "questionnaire-pdfs"),
    ];
  }
  return [path.join(process.cwd(), "var", "questionnaire-pdfs")];
}

let resolvedRoot: string | null = null;

/** Van deploy foldera — medicinski PDF upitnika ne ide u git/public. */
export function getQuestionnaireSubmissionsRootDir(): string {
  if (resolvedRoot) return resolvedRoot;
  return candidateRoots()[0];
}

export function ensureQuestionnaireSubmissionsRootDir(): string {
  if (resolvedRoot) return resolvedRoot;

  let lastErr: unknown;
  for (const root of candidateRoots()) {
    try {
      fs.mkdirSync(root, { recursive: true });
      fs.accessSync(root, fs.constants.W_OK);
      resolvedRoot = root;
      return root;
    } catch (e) {
      lastErr = e;
    }
  }

  throw lastErr instanceof Error
    ? lastErr
    : new Error("questionnaire-pdfs folder is not writable");
}

export function questionnaireSubmissionPdfAbsPath(storageKey: string): string | null {
  const k = storageKey.trim().replace(/^\/+/, "").replace(/\\/g, "/");
  if (!k || k.includes("..") || /^https?:\/\//i.test(k)) return null;
  if (!k.startsWith("questionnaire-pdfs/")) return null;
  const rel = k.slice("questionnaire-pdfs/".length);
  if (!rel || rel.includes("/")) return null;
  return path.join(getQuestionnaireSubmissionsRootDir(), rel);
}
