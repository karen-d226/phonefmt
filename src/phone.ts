import { COUNTRIES, matchCountryCode, type CountryInfo } from "./countries.js";

export interface ParsePhoneOptions {
  /** country to assume when the input has no leading + or 00 prefix */
  defaultCountry?: CountryInfo;
}

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

// Countries where domestic numbers are dialed with a leading trunk 0 that's
// dropped in E.164 form (kept in sync with the trunk-0 cases in formatNational).
const TRUNK_ZERO_CODES = new Set(["33", "31", "61", "27"]);

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

export function parsePhoneNumber(raw: string, options: ParsePhoneOptions = {}): ParsedPhone {
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
  } else if (options.defaultCountry) {
    const dc = options.defaultCountry;
    if (dc.code === "1" && digits.length === 11 && digits.startsWith("1")) {
      countryCode = "1";
      nationalDigits = digits.slice(1);
    } else if (TRUNK_ZERO_CODES.has(dc.code) && digits.startsWith("0")) {
      countryCode = dc.code;
      nationalDigits = digits.slice(1);
    } else {
      countryCode = dc.code;
      nationalDigits = digits;
    }
  } else if (digits.length === 11 && digits.startsWith("1")) {
    countryCode = "1";
    nationalDigits = digits.slice(1);
  } else if (digits.length === 10) {
    countryCode = "1";
    nationalDigits = digits;
  } else {
    return invalid(
      input,
      `cannot infer a country code from "${input}"; include a leading + or 00 prefix, or pass --country`,
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

function groupBySizes(digits: string, sizes: number[]): string {
  const groups: string[] = [];
  let i = 0;
  for (const size of sizes) {
    groups.push(digits.slice(i, i + size));
    i += size;
  }
  return groups.join(" ");
}

function formatNational(countryCode: string, nationalDigits: string): string {
  switch (countryCode) {
    case "1":
      if (nationalDigits.length === 10) {
        const area = nationalDigits.slice(0, 3);
        const exchange = nationalDigits.slice(3, 6);
        const line = nationalDigits.slice(6);
        return `(${area}) ${exchange}-${line}`;
      }
      break;
    case "33": // France: trunk 0 + five pairs, e.g. 06 12 34 56 78
      if (nationalDigits.length === 9) {
        return groupBySizes(`0${nationalDigits}`, [2, 2, 2, 2, 2]);
      }
      break;
    case "31": // Netherlands: trunk 0 + five pairs, e.g. 06 12 34 56 78
      if (nationalDigits.length === 9) {
        return groupBySizes(`0${nationalDigits}`, [2, 2, 2, 2, 2]);
      }
      break;
    case "34": // Spain: no trunk prefix, groups of 3
      if (nationalDigits.length === 9) {
        return groupBySizes(nationalDigits, [3, 3, 3]);
      }
      break;
    case "61": // Australia: mobile 04XX XXX XXX, landline 0X XXXX XXXX
      if (nationalDigits.length === 9) {
        const withTrunk = `0${nationalDigits}`;
        return nationalDigits.startsWith("4")
          ? groupBySizes(withTrunk, [4, 3, 3])
          : groupBySizes(withTrunk, [2, 4, 4]);
      }
      break;
    case "86": // China: mobile 3-4-4
      if (nationalDigits.length === 11) {
        return groupBySizes(nationalDigits, [3, 4, 4]);
      }
      break;
    case "91": // India: 5-5
      if (nationalDigits.length === 10) {
        return groupBySizes(nationalDigits, [5, 5]);
      }
      break;
    case "52": // Mexico: 3-3-4
      if (nationalDigits.length === 10) {
        return groupBySizes(nationalDigits, [3, 3, 4]);
      }
      break;
    case "27": // South Africa: trunk 0 + 3-3-4
      if (nationalDigits.length === 9) {
        return groupBySizes(`0${nationalDigits}`, [3, 3, 4]);
      }
      break;
  }

  // No per-country grouping rule on file (or the digit count didn't match the
  // shape the rule above expects): fall back to plain 3-digit chunks rather
  // than guessing at a pattern we don't actually know.
  const groups: string[] = [];
  for (let i = 0; i < nationalDigits.length; i += 3) {
    groups.push(nationalDigits.slice(i, i + 3));
  }
  return groups.join(" ");
}
