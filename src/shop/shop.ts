import type { Satispay } from "../satispay";
import type { GetDailyClosureResponse } from "./types";

const pad = (n: number) => String(n).padStart(2, "0");

export class Shop {
  private apiPath = "/g_business/v1/daily_closure";

  constructor(private readonly satispay: Satispay) {}

  /**
   * API to retrieve shop daily closure
   *
   * @param daily_closure_date A `yyyyMMdd` string, or a `Date` (formatted
   * using its **local** year/month/day parts)
   *
   * @link https://developers.satispay.com/reference/retrieve-daily-closure
   */
  async getDailyClosure(daily_closure_date: string | Date) {
    const dateParam =
      typeof daily_closure_date === "string"
        ? daily_closure_date
        : `${daily_closure_date.getFullYear()}${pad(
            daily_closure_date.getMonth() + 1,
          )}${pad(daily_closure_date.getDate())}`;
    return this.satispay.get<GetDailyClosureResponse>(
      `${this.apiPath}/${dateParam}`,
    );
  }
}
