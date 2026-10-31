import crypto from "node:crypto";
import { chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import { createInterface } from "node:readline/promises";
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { promisify } from "node:util";
import type { Readable, Writable } from "node:stream";
import { SatispayError } from "../errors";
import { Satispay, type Environment } from "../satispay";
import { loadPrivateKey } from "../utils/keys";

export interface CliIO {
  stdout: { write(chunk: string): unknown };
  stderr: { write(chunk: string): unknown };
  stdin?: Readable;
  /** Whether stdin is an interactive terminal (enables the confirmation prompt) */
  isTTY?: boolean;
  fetch?: typeof fetch;
  cwd?: string;
  /** RSA modulus length for generated keys (default 4096; lowered in tests) */
  modulusLength?: number;
}

export const KEYGEN_OPTIONS = `Options:
  --token <code>         Activation code from the Satispay Dashboard (required)
  --env <env>            staging | production (default: production)
  --out-dir <dir>        Where to write generated keys (default: current dir)
  --public-key <path>    Path to an existing public key (must match --private-key)
  --private-key <path>   Path to an existing private key (PEM or base64 PEM)
  --env-file <path>      Append SATISPAY_KEY_ID / SATISPAY_PRIVATE_KEY to this
                         file instead of printing them
  --force                Overwrite existing key files / env entries
  --yes                  Skip the production confirmation prompt
  -h, --help             Show this help
`;

export const KEYGEN_USAGE = `Usage:
  satispay-business keygen --token <ACTIVATION_CODE> [options]

Obtains a Satispay KeyId for your RSA key pair. If no private key is given, a
new 4096-bit RSA key pair is generated and saved to disk first.

${KEYGEN_OPTIONS}`;

const generateKeyPair = promisify(crypto.generateKeyPair);

function isEnvironment(value: string): value is Environment {
  return value === "staging" || value === "production";
}

async function readText(path: string): Promise<string> {
  try {
    return await readFile(path, "utf8");
  } catch (cause) {
    throw new Error(`Cannot read ${path}: ${(cause as Error).message}`, {
      cause,
    });
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function writeSecret(
  path: string,
  data: string,
  mode: number,
  force: boolean,
): Promise<void> {
  await writeFile(path, data, { mode, flag: force ? "w" : "wx" });
  await chmod(path, mode);
}

async function exists(path: string): Promise<boolean> {
  try {
    await readFile(path);
    return true;
  } catch (cause) {
    return (cause as NodeJS.ErrnoException).code !== "ENOENT";
  }
}

async function confirm(io: CliIO): Promise<boolean> {
  const rl = createInterface({
    input: io.stdin ?? process.stdin,
    output: io.stderr as unknown as Writable,
  });
  try {
    const answer = await rl.question(
      "You are about to use an activation code on PRODUCTION.\n" +
        "Activation codes are one-time: once used, they cannot be reused.\n" +
        "Continue? [y/N] ",
    );
    return /^y(es)?$/i.test(answer.trim());
  } finally {
    rl.close();
  }
}

function hintsFor(code: number | undefined): string[] {
  switch (code) {
    case 34:
      return [
        "Hint: the public key was rejected (code 34); make sure it is a valid RSA public key.",
      ];
    case 45:
      return [
        "Hint: this activation code was already used (code 45). Generate a new one from the Satispay Dashboard.",
      ];
    case 41:
      return [
        "Hint: activation code not found (code 41). Check that --env matches where the code was created (staging vs production).",
      ];
    default:
      return [];
  }
}

export async function runKeygen(argv: string[], io: CliIO): Promise<number> {
  const out = (s: string) => io.stdout.write(s);
  const err = (s: string) => io.stderr.write(s);

  let values;
  try {
    ({ values } = parseArgs({
      args: argv,
      strict: true,
      allowPositionals: false,
      options: {
        token: { type: "string" },
        env: { type: "string" },
        "out-dir": { type: "string" },
        "public-key": { type: "string" },
        "private-key": { type: "string" },
        "env-file": { type: "string" },
        force: { type: "boolean", default: false },
        yes: { type: "boolean", default: false },
        help: { type: "boolean", short: "h", default: false },
      },
    }));
  } catch (cause) {
    err(`Error: ${errorMessage(cause)}\n\n${KEYGEN_USAGE}`);
    return 1;
  }

  if (values.help) {
    out(KEYGEN_USAGE);
    return 0;
  }

  const token = values.token?.trim();
  if (!token) {
    err(`Error: --token is required\n\n${KEYGEN_USAGE}`);
    return 1;
  }

  const environment = values.env ?? "production";
  if (!isEnvironment(environment)) {
    err(
      `Error: invalid --env "${environment}" (expected staging or production)\n`,
    );
    return 1;
  }

  const cwd = io.cwd ?? process.cwd();
  const force = values.force;
  const envFile = values["env-file"]
    ? resolve(cwd, values["env-file"])
    : undefined;

  // Set once generated keys are on disk, to point retries at them.
  let savedPrivatePath: string | undefined;

  try {
    // Resolve key material.
    let privateKeyPem: string;
    let publicKeyPem: string;
    let generated = false;

    if (values["private-key"]) {
      const key = loadPrivateKey(
        await readText(resolve(cwd, values["private-key"])),
      );
      privateKeyPem = key.export({ type: "pkcs8", format: "pem" }) as string;
      const derived = crypto.createPublicKey(key);
      publicKeyPem = derived.export({ type: "spki", format: "pem" }) as string;

      if (values["public-key"]) {
        let given: crypto.KeyObject;
        try {
          given = crypto.createPublicKey(
            await readText(resolve(cwd, values["public-key"])),
          );
        } catch (cause) {
          throw new Error(`Invalid --public-key: ${errorMessage(cause)}`, {
            cause,
          });
        }
        const a = given.export({ type: "spki", format: "der" });
        const b = derived.export({ type: "spki", format: "der" });
        if (!a.equals(b)) {
          throw new Error("--public-key does not match --private-key");
        }
      }
    } else if (values["public-key"]) {
      throw new Error(
        "--public-key requires --private-key (the private key is needed to output your credentials)",
      );
    } else {
      generated = true;
      const pair = await generateKeyPair("rsa", {
        modulusLength: io.modulusLength ?? 4096,
        publicKeyEncoding: { type: "spki", format: "pem" },
        privateKeyEncoding: { type: "pkcs8", format: "pem" },
      });
      privateKeyPem = pair.privateKey;
      publicKeyPem = pair.publicKey;
    }

    const outDir = resolve(cwd, values["out-dir"] ?? ".");
    const privatePath = resolve(outDir, "private.pem");
    const publicPath = resolve(outDir, "public.pem");

    // Fail early, before consuming the one-time token.
    if (generated && !force) {
      for (const path of [privatePath, publicPath]) {
        if (await exists(path)) {
          throw new Error(`${path} already exists (use --force to overwrite)`);
        }
      }
    }
    if (envFile && !force && (await exists(envFile))) {
      if ((await readText(envFile)).includes("SATISPAY_KEY_ID=")) {
        throw new Error(
          `${envFile} already contains SATISPAY_KEY_ID (use --force to append anyway)`,
        );
      }
    }

    if (environment === "production" && !values.yes) {
      if (!io.isTTY) {
        throw new Error(
          "Refusing to use a production activation code non-interactively; pass --yes to confirm",
        );
      }
      if (!(await confirm(io))) {
        err("Aborted.\n");
        return 1;
      }
    }

    // Persist keys BEFORE the API call so a used token never loses its keys.
    if (generated) {
      await mkdir(outDir, { recursive: true });
      await writeSecret(privatePath, privateKeyPem, 0o600, force);
      await writeSecret(publicPath, publicKeyPem, 0o644, force);
      savedPrivatePath = privatePath;
      err(
        `Wrote private key to ${privatePath}\nWrote public key to ${publicPath}\n`,
      );
    }

    err(`Requesting KeyId from Satispay (${environment})...\n`);
    const { key_id: keyId } = await Satispay.obtainKeyId(
      publicKeyPem,
      token,
      environment,
      { fetch: io.fetch },
    );

    const privateKeyB64 = Buffer.from(privateKeyPem, "utf8").toString("base64");
    const lines = `SATISPAY_KEY_ID=${keyId}\nSATISPAY_PRIVATE_KEY=${privateKeyB64}\n`;

    if (envFile) {
      let prefix = "";
      if (await exists(envFile)) {
        const current = await readText(envFile);
        if (current && !current.endsWith("\n")) prefix = "\n";
      }
      await writeFile(envFile, prefix + lines, { flag: "a", mode: 0o600 });
      err(
        `KeyId obtained. Appended SATISPAY_KEY_ID and SATISPAY_PRIVATE_KEY to ${envFile}\n`,
      );
    } else {
      out(lines);
      err(
        "KeyId obtained. Store these values securely; never commit the private key.\n",
      );
    }
    return 0;
  } catch (error) {
    if (error instanceof SatispayError) {
      const wlt = error.wlt ? ` [wlt: ${error.wlt}]` : "";
      err(
        `Satispay error ${error.status} (code ${error.code ?? "n/a"}): ${error.message}${wlt}\n`,
      );
      for (const hint of hintsFor(error.code)) err(`${hint}\n`);
    } else {
      err(`Error: ${errorMessage(error)}\n`);
    }
    if (savedPrivatePath) {
      err(
        `Your new keys were kept. Retry with --private-key ${savedPrivatePath} instead of generating new ones.\n`,
      );
    }
    return 1;
  }
}
