import type { Satispay } from "../satispay";
import type { RequestOptions } from "../types/request";
import type { CreateReportRequest, CreateReportResponse } from "./types";

function formatDay(value: string | Date): string {
  if (typeof value === "string") return value;
  return value.toISOString().slice(0, 10);
}

export class Reports {
  private apiPath = "/g_business/v1/reports";

  constructor(private readonly satispay: Satispay) {}

  /**
   * API to create a new report (merchant level). The report is generated
   * asynchronously: use `notification.callback_url` or `email_cc_list` to be
   * notified. Requires a dedicated KeyID, contact Satispay to activate it.
   *
   * `payment_date_from` / `payment_date_to` also accept `Date` objects.
   *
   * @link https://developers.satispay.com/reference/create-new-report
   */
  async create(body: CreateReportRequest, options?: RequestOptions) {
    return this.satispay.post<CreateReportResponse>(this.apiPath, {
      ...options,
      body: {
        ...body,
        query_payload: {
          ...body.query_payload,
          payment_date_from: formatDay(body.query_payload.payment_date_from),
          payment_date_to: formatDay(body.query_payload.payment_date_to),
        },
      },
    });
  }
}
