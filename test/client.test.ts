import crypto from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { Satispay, SatispayError } from "../src";
import { generateKeyPair } from "./helpers";

const { publicKey, privateKey } = generateKeyPair();

function setup(
  response: Response | (() => Response) = () => new Response("{}"),
) {
  const fetchMock = vi.fn<typeof fetch>(() =>
    Promise.resolve(
      typeof response === "function" ? response() : response.clone(),
    ),
  );
  const satispay = new Satispay({
    privateKey,
    keyId: "key-1",
    environment: "staging",
    fetch: fetchMock,
  });
  return { satispay, fetchMock };
}

function lastCall(fetchMock: ReturnType<typeof setup>["fetchMock"]) {
  const [url, init] = fetchMock.mock.calls.at(-1)!;
  return {
    url: url as string,
    init: init!,
    headers: new Headers(init!.headers),
  };
}

describe("Satispay client", () => {
  it("sends signed headers and omits body/content-type on GET", async () => {
    const { satispay, fetchMock } = setup(new Response('{"id":"p1"}'));
    const res = await satispay.payment.get("p1");
    expect(res).toEqual({ id: "p1" });

    const { url, init, headers } = lastCall(fetchMock);
    expect(url).toBe(
      "https://staging.authservices.satispay.com/g_business/v1/payments/p1",
    );
    expect(init.method).toBe("GET");
    expect(init.body).toBeUndefined();
    expect(headers.has("Content-Type")).toBe(false);
    expect(headers.get("Accept")).toBe("application/json");
    expect(headers.get("x-satispay-appn")).toBe("satispay-node");
    expect(headers.get("x-satispay-appv")).toBeTruthy();
    expect(headers.get("Date")).toMatch(/\+0000$/);
    expect(headers.get("Digest")).toBe(
      "SHA-256=47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU=",
    );
    expect(headers.get("Authorization")).toMatch(/^Signature keyId="key-1"/);
  });

  it("uses the same serialized body for digest and request", async () => {
    const { satispay, fetchMock } = setup();
    await satispay.payment.create({
      flow: "MATCH_CODE",
      amount_unit: 100,
      currency: "EUR",
    });

    const { init, headers } = lastCall(fetchMock);
    expect(typeof init.body).toBe("string");
    expect(headers.get("Content-Type")).toBe("application/json");
    const expected = `SHA-256=${crypto
      .createHash("sha256")
      .update(init.body as string)
      .digest("base64")}`;
    expect(headers.get("Digest")).toBe(expected);
  });

  it("signs the path including the query string and skips undefined values", async () => {
    const { satispay, fetchMock } = setup(
      new Response('{"has_more":false,"data":[]}'),
    );
    await satispay.payment.list({
      limit: 10,
      status: "PENDING",
      starting_after: undefined,
    });

    const { url, init, headers } = lastCall(fetchMock);
    expect(url).toBe(
      "https://staging.authservices.satispay.com/g_business/v1/payments?limit=10&status=PENDING",
    );

    const signingString = [
      "(request-target): get /g_business/v1/payments?limit=10&status=PENDING",
      "host: staging.authservices.satispay.com",
      `date: ${headers.get("Date")}`,
      `digest: ${headers.get("Digest")}`,
    ].join("\n");
    const sig = /signature="([^"]+)"/.exec(headers.get("Authorization")!)![1]!;
    expect(init.method).toBe("GET");
    expect(
      crypto
        .createVerify("RSA-SHA256")
        .update(signingString)
        .verify(publicKey, sig, "base64"),
    ).toBe(true);
  });

  it("accepts a base64-encoded private key", async () => {
    const fetchMock = vi.fn<typeof fetch>(() =>
      Promise.resolve(new Response("{}")),
    );
    const satispay = new Satispay({
      privateKey: Buffer.from(privateKey).toString("base64"),
      keyId: "k",
      fetch: fetchMock,
    });
    await satispay.payment.get("x");
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("lets additionalHeaders override defaults and sets the idempotency key", async () => {
    const { satispay, fetchMock } = setup();
    await satispay.request("POST", "/g_business/v1/payments", {
      body: { a: 1 },
      idempotencyKey: "idem-1",
      additionalHeaders: { "x-satispay-appn": "my-app" },
    });
    const { headers } = lastCall(fetchMock);
    expect(headers.get("x-satispay-appn")).toBe("my-app");
    expect(headers.get("Idempotency-Key")).toBe("idem-1");
  });

  it("supports patch and delete", async () => {
    const { satispay, fetchMock } = setup();
    await satispay.patch("/x", { body: { a: 1 } });
    expect(lastCall(fetchMock).init.method).toBe("PATCH");
    await satispay.delete("/x");
    expect(lastCall(fetchMock).init.method).toBe("DELETE");
  });

  it("formats Date params for getDailyClosure as yyyyMMdd", async () => {
    const { satispay, fetchMock } = setup();
    await satispay.shop.getDailyClosure(new Date(2024, 0, 5));
    expect(lastCall(fetchMock).url).toMatch(/\/daily_closure\/20240105$/);
  });

  it("throws SatispayError with code and wlt", async () => {
    const { satispay } = setup(
      new Response(JSON.stringify({ code: 51, message: "Nope", wlt: "w-1" }), {
        status: 400,
      }),
    );
    const err = await satispay.payment.get("p").catch((e: unknown) => e);
    expect(err).toBeInstanceOf(SatispayError);
    expect(err).toMatchObject({
      status: 400,
      code: 51,
      wlt: "w-1",
      message: "Nope",
    });
  });

  it("aborts after the configured timeout", async () => {
    const fetchMock = vi.fn<typeof fetch>(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () =>
            reject(new Error("aborted")),
          );
        }),
    );
    const satispay = new Satispay({
      privateKey,
      keyId: "k",
      timeout: 20,
      fetch: fetchMock,
    });
    await expect(satispay.payment.get("p")).rejects.toThrow("aborted");
  });

  it("throws when keyId or privateKey are missing", () => {
    expect(() => new Satispay({ privateKey })).toThrow("Missing keyId");
    expect(() => new Satispay({ keyId: "k" })).toThrow("Missing privateKey");
  });
});

describe("Satispay.obtainKeyId", () => {
  it("posts the normalized public key and token", async () => {
    const fetchMock = vi.fn<typeof fetch>(() =>
      Promise.resolve(new Response('{"key_id":"abc"}')),
    );
    const res = await Satispay.obtainKeyId(
      Buffer.from(publicKey).toString("base64"),
      "tok",
      "staging",
      { fetch: fetchMock },
    );
    expect(res).toEqual({ key_id: "abc" });
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url as string).toBe(
      "https://staging.authservices.satispay.com/g_business/v1/authentication_keys",
    );
    expect(JSON.parse(init!.body as string)).toEqual({
      public_key: publicKey.trim(),
      token: "tok",
    });
  });

  it("throws SatispayError on failure", async () => {
    const fetchMock = vi.fn<typeof fetch>(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({ code: 9, message: "bad token", wlt: "w" }),
          {
            status: 401,
          },
        ),
      ),
    );
    await expect(
      Satispay.obtainKeyId(publicKey, "t", "staging", { fetch: fetchMock }),
    ).rejects.toMatchObject({ status: 401, code: 9, wlt: "w" });
  });
});
