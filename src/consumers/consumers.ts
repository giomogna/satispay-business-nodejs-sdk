import type { Satispay } from "../satispay";
import type { GetConsumerResponse } from "./types";

export class Consumers {
  constructor(private readonly satispay: Satispay) {}

  async get(phoneNumber: string) {
    return this.satispay.get<GetConsumerResponse>(
      `/g_business/v1/consumers/${phoneNumber}`
    );
  }
}
