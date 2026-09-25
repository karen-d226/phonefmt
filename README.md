# phonefmt

People type phone numbers into forms, spreadsheets, and CSV exports in every
format imaginable: `(415) 555-2671`, `415-555-2671`, `+1 415 555 2671`,
`00 44 20 7946 0958`, with or without a country code, with random spacing.
If you need to compare two numbers or store them consistently you have to
normalize them first. `phonefmt` takes a messy phone number string and tells
you its canonical E.164 form, a readable national form, which country it
belongs to, and whether it's even a plausible number at all.

It is not a replacement for a full numbering-plan database (it doesn't know
every area code or mobile prefix on earth). It covers a couple dozen common
country calling codes and has detailed national formatting for NANP
(US/Canada), France, the Netherlands, Spain, Australia, China, India,
Mexico, and South Africa. Everywhere else it falls back to plain digit
grouping.

## Usage

```
$ phonefmt "(415) 555-2671"
input:    (415) 555-2671
valid:    yes
e164:     +14155552671
national: (415) 555-2671
country:  United States / Canada (+1)

$ phonefmt "+44 20 7946 0958"
input:    +44 20 7946 0958
valid:    yes
e164:     +442079460958
national: 207 946 095 8
country:  United Kingdom (+44)

$ phonefmt "555-01"
input:    555-01
valid:    no
error:    cannot infer a country code from "555-01"; include a leading + or 00 prefix
```

You can pass more than one number; each gets its own block of output.

### Reading from stdin

If you don't pass any numbers as arguments, `phonefmt` reads them from
stdin instead, one per line (blank lines are skipped):

```
$ cat numbers.txt | phonefmt --json
[
  {
    "input": "(415) 555-2671",
    ...
  },
  ...
]
```

### JSON mode

Pass `--json` to get machine-readable output instead, for use in scripts or
pipelines:

```
$ phonefmt --json "+91 98765 43210"
{
  "input": "+91 98765 43210",
  "valid": true,
  "e164": "+919876543210",
  "national": "98765 43210",
  "countryCode": "91",
  "countryIso": "IN",
  "countryName": "India",
  "error": null
}
```

With multiple numbers, `--json` prints a JSON array of the same objects
instead of a single object.

The process exits with status 1 if any of the given numbers failed to parse,
regardless of output mode, so it's safe to use in a shell pipeline as a
validity check.

## Building

No dependencies to install. Compile with the TypeScript compiler:

```
npm run build
node dist/cli.js "+1 415 555 2671"
```

## How numbers are read

- A leading `+` or `00` is treated as an explicit international prefix.
- Without either, a 10-digit number is assumed to be NANP (US/Canada) with
  the `1` country code implied; an 11-digit number starting with `1` is
  treated the same way.
- Anything else without an explicit country code is rejected rather than
  guessed at.

## License

MIT, see LICENSE.
