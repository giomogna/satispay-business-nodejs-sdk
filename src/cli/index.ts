#!/usr/bin/env node
import { version } from "../../package.json";
import { KEYGEN_OPTIONS, runKeygen } from "./keygen";

const HELP = `satispay-business ${version}

Usage:
  satispay-business keygen --token <ACTIVATION_CODE> [options]
  satispay-business --help | --version

Commands:
  keygen    Generate an RSA key pair (or reuse yours) and obtain a Satispay KeyId

${KEYGEN_OPTIONS}`;

async function main(argv: string[]): Promise<number> {
  const [command, ...rest] = argv;

  if (
    command === undefined ||
    command === "--help" ||
    command === "-h" ||
    command === "help"
  ) {
    process.stdout.write(HELP);
    return command === undefined ? 1 : 0;
  }
  if (command === "--version" || command === "-v") {
    process.stdout.write(`${version}\n`);
    return 0;
  }
  if (command === "keygen") {
    return runKeygen(rest, {
      stdout: process.stdout,
      stderr: process.stderr,
      stdin: process.stdin,
      isTTY: process.stdin.isTTY,
    });
  }
  process.stderr.write(`Unknown command: ${command}\n\n${HELP}`);
  return 1;
}

process.exitCode = await main(process.argv.slice(2));
