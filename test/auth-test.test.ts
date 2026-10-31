import { describe, expect, it, vi } from "vitest";
import { Satispay } from "../src";
import { testAuthentication } from "../src/auth-test";
import { generateKeyPair } from "./helpers";

const { privateKey } = generateKeyPair();

function make(body: unknown) {
  const fetchMock = vi.fn<typeof fetch>(() =>
    Promise.resolve(new Response(JSON.stringify(body))),
  );
  const satispay = new Satispay({
    privateKey,
    keyId: "k",
    environment: "staging",
    fetch: fetchMock,
  });
  return { satispay, fetchMock };
}

const sig = (valid: boolean) => ({
  key_id: "k",
  algorithm: "RSA_SHA256",
  headers: ["(request-target)"],
  signature: "x",
  resign_required: false,
  iteration_count: 1,
  valid,
});

describe("testAuthentication", () => {
  it("returns valid=true for a recognized key", async () => {
    const { satispay, fetchMock } = make({
      authentication_key: { role: "ONLINE_SHOP" },
      signature: sig(true),
      signed_string: "s",
    });
    const res = await testAuthentication(satispay);
    expect(res.valid).toBe(true);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe(
      "https://staging.authservices.satispay.com/wally-services/protocol/tests/signature",
    );
    expect(init!.method).toBe("POST");
    expect(init!.body).toBeUndefined();
  });

  it("returns valid=false for PUBLIC role", async () => {
    const { satispay } = make({
      authentication_key: { role: "PUBLIC" },
      signature: sig(true),
      signed_string: "s",
    });
    expect((await testAuthentication(satispay)).valid).toBe(false);
  });

  it("returns valid=false for invalid signature", async () => {
    const { satispay } = make({
      authentication_key: { role: "DEVICE" },
      signature: sig(false),
      signed_string: "s",
    });
    expect((await testAuthentication(satispay)).valid).toBe(false);
  });
});
