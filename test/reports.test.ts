import { describe, expect, it, vi } from "vitest";
import { Satispay } from "../src";
import type { CreateReportRequest } from "../src/reports";
import { generateKeyPair } from "./helpers";

const { privateKey } = generateKeyPair();

describe("Reports", () => {
  it("creates a report and formats Date objects", async () => {
    const fetchMock = vi.fn<typeof fetch>(() =>
      Promise.resolve(new Response('{"id":"r1","status":"PENDING"}')),
    );
    const satispay = new Satispay({
      privateKey,
      keyId: "k",
      environment: "staging",
      fetch: fetchMock,
    });
    const reports = satispay.reports;
    const res = await reports.create(
      {
        type: "PAYMENT_FEE",
        format: "CSV",
        query_type: "PAYMENT_DATE_INTERVAL",
        query_payload: {
          payment_date_from: new Date("2020-06-10T00:00:00Z"),
          payment_date_to: "2020-06-12",
          time_zone: "Europe/Rome",
          columns: [{ identifier: "transaction_id" }],
        },
      },
      { idempotencyKey: "idem" },
    );
    expect(res).toEqual({ id: "r1", status: "PENDING" });
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe(
      "https://staging.authservices.satispay.com/g_business/v1/reports",
    );
    expect(init!.method).toBe("POST");
    expect(new Headers(init!.headers).get("Idempotency-Key")).toBe("idem");
    expect(
      (JSON.parse(init!.body as string) as CreateReportRequest).query_payload,
    ).toEqual({
      payment_date_from: "2020-06-10",
      payment_date_to: "2020-06-12",
      time_zone: "Europe/Rome",
      columns: [{ identifier: "transaction_id" }],
    });
  });
});
