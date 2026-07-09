// TVDB gives ISO 3166-1 alpha-3 country codes (e.g. "usa"); TMDB gives
// alpha-2 (e.g. "US"). Intl.DisplayNames' "region" type only accepts
// alpha-2, so alpha-3 codes need mapping first. Covers countries likely to
// appear for TV shows; falls back to the raw code for anything missing.
const ALPHA3_TO_ALPHA2: Record<string, string> = {
  usa: 'US',
  gbr: 'GB',
  can: 'CA',
  aus: 'AU',
  nzl: 'NZ',
  irl: 'IE',
  jpn: 'JP',
  kor: 'KR',
  chn: 'CN',
  twn: 'TW',
  hkg: 'HK',
  ind: 'IN',
  deu: 'DE',
  fra: 'FR',
  esp: 'ES',
  ita: 'IT',
  prt: 'PT',
  nld: 'NL',
  bel: 'BE',
  che: 'CH',
  aut: 'AT',
  swe: 'SE',
  nor: 'NO',
  dnk: 'DK',
  fin: 'FI',
  pol: 'PL',
  rus: 'RU',
  ukr: 'UA',
  tur: 'TR',
  grc: 'GR',
  bra: 'BR',
  mex: 'MX',
  arg: 'AR',
  chl: 'CL',
  col: 'CO',
  per: 'PE',
  zaf: 'ZA',
  egy: 'EG',
  isr: 'IL',
  sau: 'SA',
  are: 'AE',
  tha: 'TH',
  vnm: 'VN',
  idn: 'ID',
  mys: 'MY',
  phl: 'PH',
  sgp: 'SG',
  pak: 'PK',
  bgd: 'BD',
  nga: 'NG',
  ken: 'KE',
  cze: 'CZ',
  hun: 'HU',
  rou: 'RO',
  isl: 'IS',
};

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
  const alpha2 =
    code.length === 2 ? code.toUpperCase() : ALPHA3_TO_ALPHA2[code.toLowerCase()];
  if (!alpha2) return code.toUpperCase();
  try {
    return regionNames.of(alpha2) ?? code.toUpperCase();
  } catch {
    return code.toUpperCase();
  }
}
