/** Normalizuje prikaz fiksne/mobilne linije u Crnoj Gori (033 / 067). */
export function formatPhoneDisplay(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("382")) {
    const national = digits.slice(3);
    if (national.length === 8) {
      return `0${national.slice(0, 2)} ${national.slice(2, 5)} ${national.slice(5)}`;
    }
  }
  if (digits.length === 9 && digits.startsWith("382")) {
    const national = digits.slice(3);
    return `0${national.slice(0, 2)} ${national.slice(2, 5)} ${national.slice(5)}`;
  }
  if (digits.length === 8) {
    return `0${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5)}`;
  }
  return raw.trim();
}

/** E.164 tel: link za +382 (fiksni 033 i mobilni 067). */
export function telHrefMontenegro(raw: string): string | undefined {
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 8) return undefined;
  if (digits.startsWith("382")) return `tel:+${digits}`;
  if (digits.startsWith("0")) return `tel:+382${digits.slice(1)}`;
  return `tel:+382${digits}`;
}
