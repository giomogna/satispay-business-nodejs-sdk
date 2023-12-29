import type { Payment, PaymentMethodOptions, PaymentOptions } from "./common";

export type PaymentFlow =
  | "MATCH_CODE"
  | "MATCH_USER"
  | "REFUND"
  | "PRE_AUTHORIZED"
  | "FUND_LOCK"
  | "PRE_AUTHORIZED_FUND_LOCK";

interface BaseCreatePaymentRequest<T extends PaymentFlow> {
  /**
   * The flow of the payment
   */
  flow: T;

  /**
   * Amount of the payment in cents
   */
  amount_unit: number;
  /**
   * Currency of the payment (only EUR currently supported)
   */
  currency: "EUR";
  /**
   * Order ID or payment external identifier (max length allowed is 50 chars)
   */
  external_code?: string;
  /**
   * The url that will be called with an http GET request when the payment changes state. When url is called a Get payment details can be called to know the new Payment status. Note that {uuid} will be replaced with the Payment ID
   * @example "https://myServer.com/myCallbackUrl?payment_id={uuid}"
   */
  callback_url?: string;
  /**
   * The url to redirect the user after the payment flow is completed
   */
  redirect_url?: string;
  /**
   * The expiration date of the payment
   */
  expiration_date?: string;
}

interface CreateMatchUserFlowPaymentRequest
  extends BaseCreatePaymentRequest<"MATCH_USER"> {
  /**
   * Unique ID of the consumer that has to accept the payment. To retrieve the customer uid use the Retrive customer API (required with the `MATCH_USER` flow only)
   */
  consumer_uid: string;
}

interface CreateRefundFlowPaymentRequest
  extends BaseCreatePaymentRequest<"REFUND"> {
  /**
   * Unique ID of the payment to refund (required with the `REFUND` flow only)
   */
  parent_payment_uid: string;
}

interface CreatePreAuthorizedFlowPaymentRequest
  extends BaseCreatePaymentRequest<"PRE_AUTHORIZED"> {
  /**
   * Pre-Authorized token id (required with the `PRE_AUTHORIZED` flow only)
   */
  pre_authorized_payments_token: string;
}

interface CreateMatchCodeFlowPaymentRequest
  extends BaseCreatePaymentRequest<"MATCH_CODE"> {
  payment_method_options?: PaymentMethodOptions;
  payment_options?: PaymentOptions;
}

interface CreateOtherFlowsPaymentRequest
  extends BaseCreatePaymentRequest<"PRE_AUTHORIZED_FUND_LOCK" | "FUND_LOCK"> {}

export type CreatePaymentRequest =
  | CreateMatchCodeFlowPaymentRequest
  | CreateMatchUserFlowPaymentRequest
  | CreateRefundFlowPaymentRequest
  | CreatePreAuthorizedFlowPaymentRequest
  | CreateOtherFlowsPaymentRequest;

export interface CreatePaymentResponse
  extends Omit<Payment, "daily_closure" | "payment_method"> {
  /**
   * Redirect url to the payment page
   */
  redirect_url: string;
}
