import crypto from "node:crypto";
import { describe, expect, it } from "vitest";
import { Satispay } from "../src";
import { loadPrivateKey } from "../src/utils/keys";
import { signRequest } from "../src/utils/signature";
import { generateKeyPair } from "./helpers";

// Vectors and formats from https://developers.satispay.com/reference/introduction
describe("Satispay authentication docs conformance", () => {
  const { privateKey, publicKey } = generateKeyPair();
  const base = {
    method: "POST",
    path: "/g_business/v1/payments",
    host: "staging.authservices.satispay.com",
    date: "Mon, 18 Mar 2019 15:10:24 +0000",
    keyId: "my-key-id",
    privateKey,
  };

  it("matches the documented digest for the sample body", () => {
    const { digest } = signRequest({
      ...base,
      // the docs hash the body pretty-printed with 2 spaces
      body: JSON.stringify(
        { flow: "MATCH_CODE", amount_unit: 100, currency: "EUR" },
        null,
        2,
      ),
    });
    expect(digest).toBe("SHA-256=ZML76UQPYzw5yDTmhySnU1S8nmqGde/jhqOG5rpfVSI=");
  });

  it("matches the documented digest for an empty body", () => {
    const { digest } = signRequest({ ...base, body: "" });
    expect(digest).toBe("SHA-256=47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU=");
  });

  it("builds the documented message and Authorization header", () => {
    const { signingString, authorization, digest } = signRequest({
      ...base,
      body: "",
    });
    expect(signingString).toBe(
      [
        "(request-target): post /g_business/v1/payments",
        "host: staging.authservices.satispay.com",
        "date: Mon, 18 Mar 2019 15:10:24 +0000",
        `digest: ${digest}`,
      ].join("\n"),
    );
    const match =
      /^Signature keyId="my-key-id", algorithm="rsa-sha256", headers="\(request-target\) host date digest", signature="([A-Za-z0-9+/=]+)"$/.exec(
        authorization,
      );
    expect(match).not.toBeNull();
    // RSA-SHA256 with PKCS#1 v1.5 padding, base64 encoded
    expect(
      crypto
        .createVerify("RSA-SHA256")
        .update(signingString)
        .verify(publicKey, match![1]!, "base64"),
    ).toBe(true);
  });
});

describe("key handling", () => {
  const pair = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
  const pkcs1Private = pair.privateKey.export({
    type: "pkcs1",
    format: "pem",
  }) as string;
  const pkcs8Private = pair.privateKey.export({
    type: "pkcs8",
    format: "pem",
  }) as string;
  const pkcs1Public = pair.publicKey.export({
    type: "pkcs1",
    format: "pem",
  }) as string;
  const spkiPublic = (
    pair.publicKey.export({ type: "spki", format: "pem" }) as string
  ).trim();

  it("accepts PKCS#1 and PKCS#8 private keys, raw, base64 or with \\r\\n / escaped newlines", () => {
    for (const pem of [pkcs1Private, pkcs8Private]) {
      expect(loadPrivateKey(pem).asymmetricKeyType).toBe("rsa");
      expect(() =>
        loadPrivateKey(
          Buffer.from(pem.replace(/\n/g, "\r\n")).toString("base64"),
        ),
      ).not.toThrow();
      expect(() => loadPrivateKey(pem.replace(/\n/g, "\\n"))).not.toThrow();
    }
  });

  it("rejects a public key or a non-RSA key as privateKey at construction", () => {
    expect(() => new Satispay({ keyId: "k", privateKey: spkiPublic })).toThrow(
      /Invalid privateKey/,
    );
    const ec = crypto
      .generateKeyPairSync("ec", { namedCurve: "P-256" })
      .privateKey.export({ type: "pkcs8", format: "pem" }) as string;
    expect(() => new Satispay({ keyId: "k", privateKey: ec })).toThrow(
      /expected an RSA key/,
    );
  });

  it("sends the public key to the KeyId API as an SPKI PEM", async () => {
    let sent: { public_key: string; token: string } | undefined;
    let headers: Headers | undefined;
    const fetchMock: typeof fetch = (_url, init) => {
      sent = JSON.parse(init!.body as string) as typeof sent;
      headers = new Headers(init!.headers);
      return Promise.resolve(
        new Response(JSON.stringify({ key_id: "abc" }), { status: 200 }),
      );
    };
    await Satispay.obtainKeyId(pkcs1Public, "6N3ECU", "staging", {
      fetch: fetchMock,
    });
    expect(sent).toEqual({ public_key: spkiPublic, token: "6N3ECU" });
    expect(sent!.public_key.startsWith("-----BEGIN PUBLIC KEY-----\n")).toBe(
      true,
    );
    // the KeyId call is not signed
    expect(headers!.has("Authorization")).toBe(false);
  });
});
