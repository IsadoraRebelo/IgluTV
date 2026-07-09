const languageNames = new Intl.DisplayNames(['en'], { type: 'language' });
const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });

export function getLanguageDisplayName(
  code: string | null | undefined
): string | null {
  if (!code) return null;
  try {
    return languageNames.of(code) ?? null;
  } catch {
    return null;
  }
}

export function getCountryDisplayName(
  code: string | null | undefined
): string | null {
  if (!code) return null;
  try {
    return regionNames.of(code.toUpperCase()) ?? code.toUpperCase();
  } catch {
    return code.toUpperCase();
  }
}
