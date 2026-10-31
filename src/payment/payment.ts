import type { Satispay } from "../satispay";
import type { RequestOptions } from "../types/request";
import type { Payment as PaymentObjectType } from "./types/common";
import type {
  CreatePaymentRequest,
  CreatePaymentResponse,
  GetPaymentResponse,
  ListPaymentsRequest,
  ListPaymentsResponse,
  RefundPaymentRequest,
  UpdatePaymentRequest,
  UpdatePaymentResponse,
} from "./types";

export class Payment {
  private apiPath = "/g_business/v1/payments";

  constructor(private readonly satispay: Satispay) {}

  /**
   * API to retrieve the detail of a specific payment
   *
   * @link https://developers.satispay.com/reference/get-the-details-of-a-payment
   */
  async get(id: string, options?: RequestOptions) {
    return this.satispay.get<GetPaymentResponse>(
      `${this.apiPath}/${encodeURIComponent(id)}`,
      { ...options },
    );
  }

  /**
   * API to retrieve the list of payments for a specific shop
   * The shop is automatically filtered based on the `keyId` used
   *
   * @link https://developers.satispay.com/reference/get-list-of-payments
   */
  async list(params?: ListPaymentsRequest, options?: RequestOptions) {
    return this.satispay.get<ListPaymentsResponse>(this.apiPath, {
      ...options,
      query: params,
    });
  }

  /**
   * Iterates over all the payments matching `params`, fetching further pages
   * (using `starting_after`) as needed.
   */
  async *listAll(
    params?: Omit<ListPaymentsRequest, "starting_after">,
    options?: RequestOptions,
  ): AsyncGenerator<PaymentObjectType, void, undefined> {
    let startingAfter: string | undefined;
    for (;;) {
      const page: ListPaymentsResponse = await this.list(
        { ...params, starting_after: startingAfter },
        options,
      );
      for (const payment of page.data) {
        yield payment;
      }
      const last = page.data.at(-1);
      if (!page.has_more || !last) return;
      startingAfter = last.id;
    }
  }

  /**
   * API to create a payment
   *
   * @link https://developers.satispay.com/reference/create-a-payment
   */
  async create(data: CreatePaymentRequest, options?: RequestOptions) {
    return this.satispay.post<CreatePaymentResponse>(this.apiPath, {
      ...options,
      body: data,
    });
  }

  /**
   * Refunds (fully or partially) a payment. Wrapper over `create` with the `REFUND` flow.
   *
   * @link https://developers.satispay.com/reference/refund
   */
  async refund(
    parentPaymentId: string,
    data: RefundPaymentRequest,
    options?: RequestOptions,
  ) {
    return this.create(
      {
        ...data,
        flow: "REFUND",
        currency: "EUR",
        parent_payment_uid: parentPaymentId,
      },
      options,
    );
  }

  /**
   * API to update the state or metadata of a payment
   *
   * @link https://developers.satispay.com/reference/update-a-payment
   */
  async update(
    id: string,
    data: UpdatePaymentRequest,
    options?: RequestOptions,
  ) {
    return this.satispay.put<UpdatePaymentResponse>(
      `${this.apiPath}/${encodeURIComponent(id)}`,
      { ...options, body: data },
    );
  }
}
