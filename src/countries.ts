export interface CountryInfo {
  /** calling code without the leading + */
  code: string;
  iso: string;
  name: string;
  /** expected digit count after the calling code, or null if it varies too much to check */
  nationalLength: number | null;
}

// Small hand-picked table, not a full ITU assignment list. Codes are checked
// longest-first so e.g. "44" isn't mistaken for a prefix of some other entry.
export const COUNTRIES: CountryInfo[] = [
  { code: "1", iso: "US/CA", name: "United States / Canada", nationalLength: 10 },
  { code: "44", iso: "GB", name: "United Kingdom", nationalLength: null },
  { code: "49", iso: "DE", name: "Germany", nationalLength: null },
  { code: "33", iso: "FR", name: "France", nationalLength: 9 },
  { code: "34", iso: "ES", name: "Spain", nationalLength: 9 },
  { code: "39", iso: "IT", name: "Italy", nationalLength: null },
  { code: "31", iso: "NL", name: "Netherlands", nationalLength: 9 },
  { code: "61", iso: "AU", name: "Australia", nationalLength: 9 },
  { code: "64", iso: "NZ", name: "New Zealand", nationalLength: null },
  { code: "81", iso: "JP", name: "Japan", nationalLength: null },
  { code: "82", iso: "KR", name: "South Korea", nationalLength: null },
  { code: "86", iso: "CN", name: "China", nationalLength: 11 },
  { code: "91", iso: "IN", name: "India", nationalLength: 10 },
  { code: "52", iso: "MX", name: "Mexico", nationalLength: 10 },
  { code: "55", iso: "BR", name: "Brazil", nationalLength: null },
  { code: "27", iso: "ZA", name: "South Africa", nationalLength: 9 },
  { code: "234", iso: "NG", name: "Nigeria", nationalLength: null },
  { code: "971", iso: "AE", name: "United Arab Emirates", nationalLength: null },
];

export function matchCountryCode(digits: string): CountryInfo | undefined {
  const byLengthDesc = [...COUNTRIES].sort((a, b) => b.code.length - a.code.length);
  return byLengthDesc.find((c) => digits.startsWith(c.code));
}
