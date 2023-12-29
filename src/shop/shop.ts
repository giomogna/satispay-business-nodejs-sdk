import { format } from "date-fns/format";
import type { Satispay } from "../satispay";
import type { GetDailyClosureResponse } from "./types";

export class Shop {
  private apiPath = "/g_business/v1/daily_closure";

  constructor(private readonly satispay: Satispay) {}

  /**
   * API to retrieve shop daily closure
   *
   * @link https://developers.satispay.com/reference/retrieve-daily-closure
   */
  async getDailyClosure(daily_closure_date: string | Date) {
    const dateParam =
      typeof daily_closure_date === "string"
        ? daily_closure_date
        : format(daily_closure_date, "yyyyMMdd");
    return this.satispay.get<GetDailyClosureResponse>(
      `${this.apiPath}/${dateParam}`
    );
  }
}
