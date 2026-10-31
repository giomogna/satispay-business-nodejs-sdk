import { describe, expect, it, vi } from "vitest";
import { Satispay } from "../src";
import { generateKeyPair } from "./helpers";

const { privateKey } = generateKeyPair();
const BASE =
  "https://staging.authservices.satispay.com/g_business/v1/pre_authorized_payment_tokens";

function setup() {
  const fetchMock = vi.fn<typeof fetch>(() =>
    Promise.resolve(new Response('{"id":"a1","status":"PENDING"}')),
  );
  const satispay = new Satispay({
    privateKey,
    keyId: "key-1",
    environment: "staging",
    fetch: fetchMock,
  });
  const authorizations = satispay.authorizations;
  const last = () => {
    const [url, init] = fetchMock.mock.calls.at(-1)!;
    return {
      url: url as string,
      init: init!,
      headers: new Headers(init!.headers),
    };
  };
  return { authorizations, last };
}

describe("Authorizations", () => {
  it("creates with POST and body", async () => {
    const { authorizations, last } = setup();
    const body = {
      reason: "Subscription",
      callback_url: "https://x.test/cb?id={uuid}",
      redirect_url: "https://x.test/done",
      metadata: { phone_number: "+390000000000" },
    };
    const res = await authorizations.create(body);
    expect(res).toEqual({ id: "a1", status: "PENDING" });
    const { url, init } = last();
    expect(url).toBe(BASE);
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual(body);
  });

  it("gets with GET and no body", async () => {
    const { authorizations, last } = setup();
    await authorizations.get("a1");
    const { url, init, headers } = last();
    expect(url).toBe(`${BASE}/a1`);
    expect(init.method).toBe("GET");
    expect(init.body).toBeUndefined();
    expect(headers.has("Content-Type")).toBe(false);
  });

  it("cancels with PUT status CANCELED", async () => {
    const { authorizations, last } = setup();
    await authorizations.cancel("a1");
    const { url, init } = last();
    expect(url).toBe(`${BASE}/a1`);
    expect(init.method).toBe("PUT");
    expect(JSON.parse(init.body as string)).toEqual({ status: "CANCELED" });
  });

  it("update sends the given body", async () => {
    const { authorizations, last } = setup();
    await authorizations.update("a1", { consumer_uid: "c1" });
    expect(JSON.parse(last().init.body as string)).toEqual({
      consumer_uid: "c1",
    });
  });

  it("passes request options through", async () => {
    const { authorizations, last } = setup();
    const controller = new AbortController();
    const opts = {
      idempotencyKey: "idem-1",
      additionalHeaders: { "x-satispay-tracking-code": "trk" },
      signal: controller.signal,
    };
    for (const call of [
      () => authorizations.create({}, opts),
      () => authorizations.get("a1", opts),
      () => authorizations.cancel("a1", opts),
    ]) {
      await call();
      const { headers, init } = last();
      expect(headers.get("Idempotency-Key")).toBe("idem-1");
      expect(headers.get("x-satispay-tracking-code")).toBe("trk");
      expect(init.signal).toBeDefined();
    }
  });
});
