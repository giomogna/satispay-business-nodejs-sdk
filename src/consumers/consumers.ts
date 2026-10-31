import type { Satispay } from "../satispay";
import type { GetConsumerResponse } from "./types";

export class Consumers {
  constructor(private readonly satispay: Satispay) {}

  /**
   * Retrieve a consumer by phone number.
   *
   * @deprecated Satispay deprecated the `MATCH_USER` flow this lookup exists for.
   * Prefer the `MATCH_CODE` flow.
   *
   * @link https://developers.satispay.com/reference/retrieve-consumer
   */
  async get(phoneNumber: string) {
    return this.satispay.get<GetConsumerResponse>(
      `/g_business/v1/consumers/${phoneNumber}`,
    );
  }
}
