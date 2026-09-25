#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { parsePhoneNumber, type ParsedPhone } from "./phone.js";

const USAGE = `phonefmt - normalize and validate phone numbers

usage:
  phonefmt [--json] <number> [<number> ...]
  <something> | phonefmt [--json]

examples:
  phonefmt "(415) 555-2671"
  phonefmt "+44 20 7946 0958"
  phonefmt --json "+91 98765 43210"
  cat numbers.txt | phonefmt --json

options:
  --json      print results as JSON instead of plain text
  -h, --help  show this message

with no <number> arguments, numbers are read from stdin, one per line.
blank lines are skipped. exit status is 1 if any given number failed to
parse.
`;

function readNumbersFromStdin(): string[] {
  const text = readFileSync(0, "utf-8");
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function formatHumanBlock(result: ParsedPhone): string {
  const lines = [`input:    ${result.input}`];

  if (!result.valid) {
    lines.push("valid:    no");
    lines.push(`error:    ${result.error}`);
    return lines.join("\n");
  }

  lines.push("valid:    yes");
  lines.push(`e164:     ${result.e164}`);
  lines.push(`national: ${result.national}`);
  lines.push(`country:  ${result.countryName} (+${result.countryCode})`);
  return lines.join("\n");
}

function main(): void {
  const argv = process.argv.slice(2);
  let jsonMode = false;
  const numbers: string[] = [];

  for (const arg of argv) {
    if (arg === "--json") {
      jsonMode = true;
    } else if (arg === "-h" || arg === "--help") {
      process.stdout.write(USAGE);
      return;
    } else if (arg.startsWith("-")) {
      process.stderr.write(`phonefmt: unknown option "${arg}"\n`);
      process.exitCode = 1;
      return;
    } else {
      numbers.push(arg);
    }
  }

  if (numbers.length === 0 && !process.stdin.isTTY) {
    numbers.push(...readNumbersFromStdin());
  }

  if (numbers.length === 0) {
    process.stderr.write(USAGE);
    process.exitCode = 1;
    return;
  }

  const results = numbers.map(parsePhoneNumber);

  if (jsonMode) {
    const payload = results.length === 1 ? results[0] : results;
    process.stdout.write(JSON.stringify(payload, null, 2) + "\n");
  } else {
    process.stdout.write(results.map(formatHumanBlock).join("\n\n") + "\n");
  }

  if (results.some((r) => !r.valid)) {
    process.exitCode = 1;
  }
}

main();
