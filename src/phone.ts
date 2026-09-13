import { COUNTRIES, matchCountryCode } from "./countries.js";

export interface ParsedPhone {
  input: string;
  valid: boolean;
  e164: string | null;
  national: string | null;
  countryCode: string | null;
  countryIso: string | null;
  countryName: string | null;
  error: string | null;
}

function onlyDigits(value: string): string {
  return value.replace(/[^0-9]/g, "");
}

function invalid(input: string, error: string, partial: Partial<ParsedPhone> = {}): ParsedPhone {
  return {
    input,
    valid: false,
    e164: null,
    national: null,
    countryCode: null,
    countryIso: null,
    countryName: null,
    error,
    ...partial,
  };
}

export function parsePhoneNumber(raw: string): ParsedPhone {
  const input = raw.trim();

  if (input.length === 0) {
    return invalid(input, "empty input");
  }

  let digits: string;
  let hasExplicitCountryCode: boolean;

  if (input.startsWith("+")) {
    digits = onlyDigits(input);
    hasExplicitCountryCode = true;
  } else if (input.startsWith("00")) {
    digits = onlyDigits(input).slice(2);
    hasExplicitCountryCode = true;
  } else {
    digits = onlyDigits(input);
    hasExplicitCountryCode = false;
  }

  if (digits.length === 0) {
    return invalid(input, "no digits found in input");
  }

  let countryCode: string;
  let nationalDigits: string;

  if (hasExplicitCountryCode) {
    const country = matchCountryCode(digits);
    if (!country) {
      return invalid(input, `unrecognized country calling code in "${input}"`);
    }
    countryCode = country.code;
    nationalDigits = digits.slice(country.code.length);
  } else if (digits.length === 11 && digits.startsWith("1")) {
    countryCode = "1";
    nationalDigits = digits.slice(1);
  } else if (digits.length === 10) {
    countryCode = "1";
    nationalDigits = digits;
  } else {
    return invalid(
      input,
      `cannot infer a country code from "${input}"; include a leading + or 00 prefix`,
    );
  }

  const country = COUNTRIES.find((c) => c.code === countryCode);

  if (nationalDigits.length === 0) {
    return invalid(input, "no digits remain after the country code", {
      countryCode,
      countryIso: country?.iso ?? null,
      countryName: country?.name ?? null,
    });
  }

  if (country?.nationalLength != null && nationalDigits.length !== country.nationalLength) {
    return invalid(
      input,
      `expected ${country.nationalLength} digits after country code +${countryCode}, got ${nationalDigits.length}`,
      { countryCode, countryIso: country.iso, countryName: country.name },
    );
  }

  return {
    input,
    valid: true,
    e164: `+${countryCode}${nationalDigits}`,
    national: formatNational(countryCode, nationalDigits),
    countryCode,
    countryIso: country?.iso ?? null,
    countryName: country?.name ?? null,
    error: null,
  };
}

function formatNational(countryCode: string, nationalDigits: string): string {
  if (countryCode === "1" && nationalDigits.length === 10) {
    const area = nationalDigits.slice(0, 3);
    const exchange = nationalDigits.slice(3, 6);
    const line = nationalDigits.slice(6);
    return `(${area}) ${exchange}-${line}`;
  }

  // No per-country grouping rule on file: fall back to plain 3-digit chunks
  // rather than guessing at a pattern we don't actually know.
  const groups: string[] = [];
  for (let i = 0; i < nationalDigits.length; i += 3) {
    groups.push(nationalDigits.slice(i, i + 3));
  }
  return groups.join(" ");
}
