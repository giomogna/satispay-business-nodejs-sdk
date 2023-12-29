import type { Satispay } from "../satispay";
import {
  UpdatePaymentResponse,
  type CreatePaymentRequest,
  type CreatePaymentResponse,
  type GetPaymentResponse,
  type UpdatePaymentRequest,
  ListPaymentsRequest,
  ListPaymentsResponse,
} from "./types";

export class Payment {
  private apiPath = "/g_business/v1/payments";

  constructor(private readonly satispay: Satispay) {}

  /**
   * API to retrieve the detail of a specific payment
   *
   * @link https://developers.satispay.com/reference/get-the-details-of-a-payment
   */
  async get(id: string) {
    return this.satispay.get<GetPaymentResponse>(`${this.apiPath}/${id}`);
  }

  /**
   * API to retrieve the list of payments for a specific shop
   * The shop is automatically filtered based on the `keyId` used
   *
   * @link https://developers.satispay.com/reference/get-list-of-payments
   */
  async list(params?: ListPaymentsRequest) {
    const searchParams = params
      ? `?${new URLSearchParams(params as any).toString()}`
      : "";
    return this.satispay.get<ListPaymentsResponse>(
      `${this.apiPath}${searchParams}`
    );
  }

  /**
   * API to create a payment
   *
   * @link https://developers.satispay.com/reference/create-a-payment
   */
  async create(data: CreatePaymentRequest) {
    return this.satispay.post<CreatePaymentResponse>(`${this.apiPath}`, {
      body: data,
    });
  }

  /**
   * API to update the state or metadata of a payment
   *
   * @link https://developers.satispay.com/reference/update-a-payment
   */
  async update(id: string, data: UpdatePaymentRequest) {
    return this.satispay.put<UpdatePaymentResponse>(`${this.apiPath}/${id}`, {
      body: data,
    });
  }
}
