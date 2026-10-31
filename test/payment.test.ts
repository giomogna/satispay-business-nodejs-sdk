import { describe, expect, expectTypeOf, it, vi } from "vitest";
import { Satispay } from "../src";
import type { CreatePaymentRequest } from "../src";
import { generateKeyPair } from "./helpers";

const { privateKey } = generateKeyPair();

function setup(responses: unknown[] = [{}]) {
  let i = 0;
  const fetchMock = vi.fn<typeof fetch>(() =>
    Promise.resolve(
      new Response(
        JSON.stringify(responses[Math.min(i++, responses.length - 1)]),
      ),
    ),
  );
  const satispay = new Satispay({
    privateKey,
    keyId: "k",
    environment: "staging",
    fetch: fetchMock,
  });
  return { satispay, fetchMock };
}

const body = (fetchMock: ReturnType<typeof setup>["fetchMock"]): unknown =>
  JSON.parse(fetchMock.mock.calls.at(-1)![1]!.body as string);

describe("payment.create", () => {
  const base = { amount_unit: 100, currency: "EUR" } as const;
  const flows: CreatePaymentRequest[] = [
    { ...base, flow: "MATCH_CODE", metadata: { phone_number: "+39333" } },
    { ...base, flow: "HOTP_AUTH", token: "123456" },
    { ...base, flow: "PRE_AUTHORIZED", token: "t" },
    { ...base, flow: "PRE_AUTHORIZED", pre_authorized_payments_token: "t" },
    { ...base, flow: "PRE_AUTHORIZED_FUND_LOCK", token: "t" },
    { ...base, flow: "FUND_LOCK" },
    { ...base, flow: "REFUND", parent_payment_uid: "p" },
  ];

  it.each(flows)("sends the body for flow $flow", async (req) => {
    const { satispay, fetchMock } = setup();
    await satispay.payment.create(req);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toContain("/g_business/v1/payments");
    expect(init!.method).toBe("POST");
    expect(body(fetchMock)).toEqual(req);
  });

  it("passes idempotency key and headers", async () => {
    const { satispay, fetchMock } = setup();
    await satispay.payment.create(flows[0]!, {
      idempotencyKey: "abc",
      additionalHeaders: { "x-satispay-tracking-code": "tc" },
    });
    const h = new Headers(fetchMock.mock.calls[0]![1]!.headers);
    expect(h.get("Idempotency-Key")).toBe("abc");
    expect(h.get("x-satispay-tracking-code")).toBe("tc");
  });

  it("passes options on get/update/list", async () => {
    const { satispay, fetchMock } = setup();
    const ac = new AbortController();
    await satispay.payment.get("a b", {
      idempotencyKey: "1",
      signal: ac.signal,
    });
    await satispay.payment.update(
      "p",
      { action: "ACCEPT" },
      { idempotencyKey: "2" },
    );
    await satispay.payment.list({ limit: 1 }, { idempotencyKey: "3" });
    const keys = fetchMock.mock.calls.map((c) =>
      new Headers(c[1]!.headers).get("Idempotency-Key"),
    );
    expect(keys).toEqual(["1", "2", "3"]);
    expect(fetchMock.mock.calls[0]![0]).toContain("/payments/a%20b");
  });
});

describe("payment.refund", () => {
  it("wraps create with REFUND flow", async () => {
    const { satispay, fetchMock } = setup();
    await satispay.payment.refund(
      "parent-1",
      { amount_unit: 50, external_code: "x", metadata: { a: "b" } },
      { idempotencyKey: "k1" },
    );
    expect(body(fetchMock)).toEqual({
      flow: "REFUND",
      currency: "EUR",
      parent_payment_uid: "parent-1",
      amount_unit: 50,
      external_code: "x",
      metadata: { a: "b" },
    });
    expect(
      new Headers(fetchMock.mock.calls[0]![1]!.headers).get("Idempotency-Key"),
    ).toBe("k1");
  });
});

describe("payment.listAll", () => {
  it("paginates across 3 pages using starting_after", async () => {
    const { satispay, fetchMock } = setup([
      { has_more: true, data: [{ id: "a" }, { id: "b" }] },
      { has_more: true, data: [{ id: "c" }] },
      { has_more: false, data: [{ id: "d" }] },
    ]);
    const ids: string[] = [];
    for await (const p of satispay.payment.listAll({
      limit: 2,
      status: "PENDING",
    })) {
      ids.push(p.id);
    }
    expect(ids).toEqual(["a", "b", "c", "d"]);
    const urls = fetchMock.mock.calls.map((c) => new URL(c[0] as string));
    expect(urls).toHaveLength(3);
    expect(urls[0]!.searchParams.has("starting_after")).toBe(false);
    expect(urls[1]!.searchParams.get("starting_after")).toBe("b");
    expect(urls[2]!.searchParams.get("starting_after")).toBe("c");
    expect(urls[2]!.searchParams.get("status")).toBe("PENDING");
  });

  it("stops on an empty page", async () => {
    const { satispay, fetchMock } = setup([{ has_more: true, data: [] }]);
    const out = [];
    for await (const p of satispay.payment.listAll()) out.push(p);
    expect(out).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("payment request types", () => {
  const base = { amount_unit: 1, currency: "EUR" } as const;
  const t = (_: CreatePaymentRequest) => undefined;

  it("accepts valid combinations", () => {
    expectTypeOf({
      ...base,
      flow: "HOTP_AUTH",
      token: "1",
    } as const).toExtend<CreatePaymentRequest>();
    expectTypeOf({
      ...base,
      flow: "PRE_AUTHORIZED",
      token: "1",
    } as const).toExtend<CreatePaymentRequest>();
  });

  it("rejects invalid flow/field combinations", () => {
    // prettier-ignore
    const checks = () => {
      // @ts-expect-error unknown flow
      t({ ...base, flow: "NOPE" });
      // @ts-expect-error HOTP_AUTH requires token
      t({ ...base, flow: "HOTP_AUTH" });
      // @ts-expect-error PRE_AUTHORIZED requires token or pre_authorized_payments_token
      t({ ...base, flow: "PRE_AUTHORIZED" });
      // @ts-expect-error expiration_date not allowed for HOTP_AUTH
      t({ ...base, flow: "HOTP_AUTH", token: "1", expiration_date: "x" });
      // @ts-expect-error expiration_date not allowed for REFUND
      t({ ...base, flow: "REFUND", parent_payment_uid: "p", expiration_date: "x" });
      // @ts-expect-error metadata values must be strings
      t({ ...base, flow: "MATCH_CODE", metadata: { a: 1 } });
      // @ts-expect-error PRE_AUTHORIZED_FUND_LOCK requires token
      t({ ...base, flow: "PRE_AUTHORIZED_FUND_LOCK" });
      // @ts-expect-error currency must be EUR
      t({ flow: "MATCH_CODE", amount_unit: 1, currency: "USD" });
    };
    expect(checks).toBeTypeOf("function");
  });
});
