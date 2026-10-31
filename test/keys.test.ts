import { describe, expect, it } from "vitest";
import { normalizePem } from "../src/utils/keys";
import { generateKeyPair } from "./helpers";

const { privateKey } = generateKeyPair();

describe("normalizePem", () => {
  it("returns a PEM string unchanged", () => {
    expect(normalizePem(privateKey)).toBe(privateKey.trim());
  });

  it("decodes a base64-encoded PEM", () => {
    const b64 = Buffer.from(privateKey).toString("base64");
    expect(normalizePem(b64)).toBe(privateKey.trim());
  });

  it("handles escaped newlines", () => {
    const escaped = privateKey.trim().replace(/\n/g, "\\n");
    expect(normalizePem(escaped)).toBe(privateKey.trim());
  });

  it("throws on garbage input", () => {
    expect(() => normalizePem("not a key")).toThrow(/Invalid key/);
  });
});
