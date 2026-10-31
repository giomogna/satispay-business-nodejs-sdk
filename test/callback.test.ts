import crypto from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  parseCallback,
  verifyCallbackDigest,
  verifyCallbackSignature,
} from "../src/utils/callback";
import { signRequest } from "../src/utils/signature";
import { generateKeyPair } from "./helpers";

describe("parseCallback", () => {
  it("extracts the id from string, URL and path", () => {
    expect(parseCallback("https://e.com/cb?payment_id=abc")).toBe("abc");
    expect(parseCallback(new URL("https://e.com/cb?payment_id=abc"))).toBe(
      "abc",
    );
    expect(parseCallback("/cb?authorization_id=z", "authorization_id")).toBe(
      "z",
    );
  });
  it("returns undefined when missing or empty", () => {
    expect(parseCallback("https://e.com/cb")).toBeUndefined();
    expect(parseCallback("https://e.com/cb?payment_id=")).toBeUndefined();
  });
});

describe("verifyCallbackDigest", () => {
  const digest = (b: string) =>
    `SHA-256=${crypto.createHash("sha256").update(b).digest("base64")}`;
  it("accepts matching digest, including empty body", () => {
    expect(verifyCallbackDigest("hello", digest("hello"))).toBe(true);
    expect(verifyCallbackDigest(Buffer.from("hello"), digest("hello"))).toBe(
      true,
    );
    expect(verifyCallbackDigest("", digest(""))).toBe(true);
  });
  it("rejects mismatches and missing header", () => {
    expect(verifyCallbackDigest("hello", digest("other"))).toBe(false);
    expect(verifyCallbackDigest("hello", undefined)).toBe(false);
    expect(verifyCallbackDigest("hello", null)).toBe(false);
    expect(verifyCallbackDigest("hello", "SHA-256=short")).toBe(false);
  });
});

describe("verifyCallbackSignature", () => {
  const { publicKey, privateKey } = generateKeyPair();
  const path = "/cb?payment_id=abc";
  const date = "Mon, 18 Mar 2019 15:10:24 +0000";
  const { digest, authorization } = signRequest({
    method: "GET",
    path,
    host: "example.com",
    date,
    body: "",
    keyId: "satispay",
    privateKey,
  });
  const headers = { host: "example.com", date, digest, authorization };

  it("verifies a valid signature", () => {
    expect(
      verifyCallbackSignature({ method: "GET", path, headers, publicKey }),
    ).toBe(true);
    expect(
      verifyCallbackSignature({
        method: "GET",
        path,
        headers: new Headers(headers),
        publicKey,
      }),
    ).toBe(true);
    expect(
      verifyCallbackSignature({
        method: "GET",
        path,
        headers: {
          Host: "example.com",
          Date: date,
          Digest: digest,
          Authorization: authorization,
        },
        publicKey: Buffer.from(publicKey).toString("base64"),
      }),
    ).toBe(true);
  });

  it("rejects tampered data or wrong key", () => {
    expect(
      verifyCallbackSignature({
        method: "GET",
        path: "/cb?payment_id=evil",
        headers,
        publicKey,
      }),
    ).toBe(false);
    expect(
      verifyCallbackSignature({
        method: "GET",
        path,
        headers: { ...headers, date: "Tue, 19 Mar 2019 15:10:24 +0000" },
        publicKey,
      }),
    ).toBe(false);
    expect(
      verifyCallbackSignature({
        method: "GET",
        path,
        headers,
        publicKey: generateKeyPair().publicKey,
      }),
    ).toBe(false);
  });

  it("rejects missing/garbage Authorization", () => {
    expect(
      verifyCallbackSignature({ method: "GET", path, headers: {}, publicKey }),
    ).toBe(false);
    expect(
      verifyCallbackSignature({
        method: "GET",
        path,
        headers: { authorization: "Bearer x" },
        publicKey,
      }),
    ).toBe(false);
  });
});
