import crypto from "node:crypto";
import { describe, expect, it } from "vitest";
import { signRequest } from "../src/utils/signature";
import { generateKeyPair } from "./helpers";

const { publicKey, privateKey } = generateKeyPair();

describe("signRequest", () => {
  const input = {
    method: "POST",
    path: "/g_business/v1/payments?limit=10",
    host: "staging.authservices.satispay.com",
    date: "Mon, 18 Mar 2019 15:10:24 +0000",
    body: '{"amount_unit":100}',
    keyId: "my-key-id",
    privateKey,
  };

  it("builds the expected signing string and digest", () => {
    const { digest, signingString } = signRequest(input);
    const expectedDigest = `SHA-256=${crypto
      .createHash("sha256")
      .update(input.body)
      .digest("base64")}`;
    expect(digest).toBe(expectedDigest);
    expect(signingString).toBe(
      [
        "(request-target): post /g_business/v1/payments?limit=10",
        "host: staging.authservices.satispay.com",
        "date: Mon, 18 Mar 2019 15:10:24 +0000",
        `digest: ${expectedDigest}`,
      ].join("\n"),
    );
  });

  it("produces an Authorization header with a verifiable signature", () => {
    const { authorization, signingString } = signRequest(input);
    const match =
      /^Signature keyId="my-key-id", algorithm="rsa-sha256", headers="\(request-target\) host date digest", signature="([^"]+)"$/.exec(
        authorization,
      );
    expect(match).not.toBeNull();
    const valid = crypto
      .createVerify("RSA-SHA256")
      .update(signingString)
      .verify(publicKey, match![1]!, "base64");
    expect(valid).toBe(true);
  });

  it("uses the digest of the empty string when there is no body", () => {
    const { digest } = signRequest({ ...input, method: "GET", body: "" });
    expect(digest).toBe("SHA-256=47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU=");
  });
});
