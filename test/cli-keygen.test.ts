import crypto from "node:crypto";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { runKeygen, type CliIO } from "../src/cli/keygen";
import { loadPrivateKey } from "../src/utils/keys";
import { generateKeyPair } from "./helpers";

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "satispay-cli-"));
});
afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

function setup(
  response: () => Response = () =>
    Response.json({ key_id: "key-123" }, { status: 200 }),
  extra: Partial<CliIO> = {},
) {
  let stdout = "";
  let stderr = "";
  const fetchMock = vi.fn((..._args: Parameters<typeof fetch>) =>
    Promise.resolve(response()),
  );
  const io: CliIO = {
    stdout: { write: (s) => (stdout += s) },
    stderr: { write: (s) => (stderr += s) },
    fetch: fetchMock,
    cwd: dir,
    isTTY: false,
    modulusLength: 2048,
    ...extra,
  };
  return {
    io,
    fetchMock,
    out: () => stdout,
    err: () => stderr,
  };
}

function sentBody(fetchMock: ReturnType<typeof setup>["fetchMock"]) {
  const init = fetchMock.mock.calls[0]?.[1];
  return JSON.parse(init?.body as string) as {
    public_key: string;
    token: string;
  };
}

describe("satispay-business keygen", () => {
  it("generates keys, writes files and prints credentials", async () => {
    const t = setup();
    const code = await runKeygen(
      ["--token", "ABC123", "--env", "staging"],
      t.io,
    );
    expect(code).toBe(0);

    const privatePem = await readFile(join(dir, "private.pem"), "utf8");
    const publicPem = await readFile(join(dir, "public.pem"), "utf8");
    expect(privatePem).toContain("BEGIN PRIVATE KEY");
    expect(publicPem).toContain("BEGIN PUBLIC KEY");
    expect((await stat(join(dir, "private.pem"))).mode & 0o777).toBe(0o600);
    expect((await stat(join(dir, "public.pem"))).mode & 0o777).toBe(0o644);

    expect(t.fetchMock).toHaveBeenCalledTimes(1);
    expect(t.fetchMock.mock.calls[0]?.[0]).toBe(
      "https://staging.authservices.satispay.com/g_business/v1/authentication_keys",
    );
    const body = sentBody(t.fetchMock);
    expect(body.token).toBe("ABC123");
    expect(body.public_key.trim()).toBe(publicPem.trim());

    const lines = t.out().trim().split("\n");
    expect(lines).toHaveLength(2);
    expect(lines[0]).toBe("SATISPAY_KEY_ID=key-123");
    const b64 = lines[1]?.replace("SATISPAY_PRIVATE_KEY=", "") ?? "";
    expect(b64).not.toContain("\n");
    const decoded = Buffer.from(b64, "base64").toString("utf8");
    expect(decoded).toBe(privatePem);
    expect(loadPrivateKey(decoded).asymmetricKeyType).toBe("rsa");
  });

  it("refuses to overwrite existing key files without --force", async () => {
    await writeFile(join(dir, "private.pem"), "existing");
    const t = setup();
    const code = await runKeygen(["--token", "T", "--env", "staging"], t.io);
    expect(code).toBe(1);
    expect(t.err()).toContain("already exists");
    expect(t.fetchMock).not.toHaveBeenCalled();
    expect(await readFile(join(dir, "private.pem"), "utf8")).toBe("existing");

    const forced = setup();
    expect(
      await runKeygen(
        ["--token", "T", "--env", "staging", "--force"],
        forced.io,
      ),
    ).toBe(0);
    expect(await readFile(join(dir, "private.pem"), "utf8")).toContain(
      "PRIVATE KEY",
    );
  });

  it("uses a provided private key and verifies the public key", async () => {
    const pair = generateKeyPair();
    const other = generateKeyPair();
    await writeFile(join(dir, "priv.pem"), pair.privateKey);
    await writeFile(join(dir, "pub.pem"), pair.publicKey);
    await writeFile(join(dir, "other.pem"), other.publicKey);

    const ok = setup();
    expect(
      await runKeygen(
        [
          "--token",
          "T",
          "--env",
          "staging",
          "--private-key",
          "priv.pem",
          "--public-key",
          "pub.pem",
        ],
        ok.io,
      ),
    ).toBe(0);
    expect(
      crypto.createPublicKey(sentBody(ok.fetchMock).public_key).export({
        type: "spki",
        format: "der",
      }),
    ).toEqual(
      crypto
        .createPublicKey(pair.publicKey)
        .export({ type: "spki", format: "der" }),
    );
    await expect(stat(join(dir, "public.pem"))).rejects.toThrow();

    const bad = setup();
    expect(
      await runKeygen(
        [
          "--token",
          "T",
          "--env",
          "staging",
          "--private-key",
          "priv.pem",
          "--public-key",
          "other.pem",
        ],
        bad.io,
      ),
    ).toBe(1);
    expect(bad.err()).toContain("does not match");
    expect(bad.fetchMock).not.toHaveBeenCalled();
  });

  it("errors on --public-key without --private-key", async () => {
    const t = setup();
    expect(
      await runKeygen(
        ["--token", "T", "--env", "staging", "--public-key", "x.pem"],
        t.io,
      ),
    ).toBe(1);
    expect(t.err()).toContain("requires --private-key");
  });

  it("requires --yes for production when not a TTY", async () => {
    const t = setup();
    const code = await runKeygen(["--token", "T"], t.io);
    expect(code).toBe(1);
    expect(t.err()).toContain("--yes");
    expect(t.fetchMock).not.toHaveBeenCalled();
  });

  it("uses the production URL with --yes", async () => {
    const t = setup();
    expect(await runKeygen(["--token", "T", "--yes"], t.io)).toBe(0);
    expect(t.fetchMock.mock.calls[0]?.[0]).toBe(
      "https://authservices.satispay.com/g_business/v1/authentication_keys",
    );
  });

  it("appends to --env-file without printing the private key", async () => {
    const t = setup();
    const envFile = join(dir, ".env");
    await writeFile(envFile, "FOO=bar");
    const code = await runKeygen(
      ["--token", "T", "--env", "staging", "--env-file", envFile],
      t.io,
    );
    expect(code).toBe(0);
    const content = await readFile(envFile, "utf8");
    expect(content).toMatch(
      /^FOO=bar\nSATISPAY_KEY_ID=key-123\nSATISPAY_PRIVATE_KEY=\S+\n$/,
    );
    const privateB64 = /SATISPAY_PRIVATE_KEY=(\S+)/.exec(content)?.[1] ?? "";
    expect(privateB64.length).toBeGreaterThan(100);
    expect(t.out()).toBe("");
    expect(t.err()).not.toContain(privateB64);

    const again = setup();
    expect(
      await runKeygen(
        ["--token", "T", "--env", "staging", "--env-file", envFile, "--force"],
        again.io,
      ),
    ).toBe(0);
    const refused = setup();
    expect(
      await runKeygen(
        [
          "--token",
          "T",
          "--env",
          "staging",
          "--env-file",
          envFile,
          "--out-dir",
          join(dir, "o"),
        ],
        refused.io,
      ),
    ).toBe(1);
    expect(refused.err()).toContain("already contains SATISPAY_KEY_ID");
  });

  it("reports SatispayError code 45 with a hint", async () => {
    const t = setup(() =>
      Response.json(
        { code: 45, message: "Token already used", wlt: "abc" },
        { status: 403 },
      ),
    );
    const code = await runKeygen(["--token", "T", "--env", "staging"], t.io);
    expect(code).toBe(1);
    expect(t.err()).toContain(
      "Satispay error 403 (code 45): Token already used [wlt: abc]",
    );
    expect(t.err()).toContain("already used");
    expect(t.err()).not.toContain("    at ");
    // keys remain on disk even though the call failed
    expect((await stat(join(dir, "private.pem"))).isFile()).toBe(true);
  });

  it("fails with usage when --token is missing", async () => {
    const t = setup();
    expect(await runKeygen([], t.io)).toBe(1);
    expect(t.err()).toContain("--token is required");
    expect(t.err()).toContain("Usage:");
    expect(t.fetchMock).not.toHaveBeenCalled();
  });

  it("rejects an invalid --env and unknown flags", async () => {
    const a = setup();
    expect(await runKeygen(["--token", "T", "--env", "dev"], a.io)).toBe(1);
    const b = setup();
    expect(await runKeygen(["--token", "T", "--nope"], b.io)).toBe(1);
  });
});
