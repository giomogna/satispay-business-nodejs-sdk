import type { Payment, PaymentMethodOptions, PaymentOptions } from "./common";

export type PaymentFlow =
  | "MATCH_CODE"
  /** @deprecated MATCH_USER is deprecated by Satispay */
  | "MATCH_USER"
  | "REFUND"
  | "PRE_AUTHORIZED"
  | "HOTP_AUTH"
  | "FUND_LOCK"
  | "PRE_AUTHORIZED_FUND_LOCK";

/**
 * Custom key/value pairs attached to a payment.
 * Max 20 keys; key max 45 chars; value max 500 chars.
 * The special key `phone_number` (E.164) can be used to send a notification to the customer.
 */
export type PaymentMetadata = Record<string, string>;

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
   * Custom metadata (max 20 keys, key <= 45 chars, value <= 500 chars).
   * The special key `phone_number` triggers a customer notification.
   */
  metadata?: PaymentMetadata;
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

/** Flows for which `expiration_date` is not allowed */
type WithoutExpiration<T extends PaymentFlow> = Omit<
  BaseCreatePaymentRequest<T>,
  "expiration_date"
> & {
  expiration_date?: never;
};

/**
 * @deprecated MATCH_USER is deprecated by Satispay
 */
export interface CreateMatchUserFlowPaymentRequest extends BaseCreatePaymentRequest<"MATCH_USER"> {
  /**
   * Unique ID of the consumer that has to accept the payment (required with the `MATCH_USER` flow only)
   * @deprecated MATCH_USER is deprecated by Satispay
   */
  consumer_uid: string;
}

export type CreateRefundFlowPaymentRequest = WithoutExpiration<"REFUND"> & {
  /**
   * Unique ID of the payment to refund (required with the `REFUND` flow only)
   */
  parent_payment_uid: string;
};

type PreAuthorizedTokenFields =
  | {
      /** Pre-authorization token */
      token: string;
      /** @deprecated Use `token` */
      pre_authorized_payments_token?: string;
    }
  | {
      token?: never;
      /** @deprecated Use `token` */
      pre_authorized_payments_token: string;
    };

export type CreatePreAuthorizedFlowPaymentRequest =
  WithoutExpiration<"PRE_AUTHORIZED"> & PreAuthorizedTokenFields;

export type CreateHotpAuthFlowPaymentRequest =
  WithoutExpiration<"HOTP_AUTH"> & {
    /**
     * The HOTP token shown by the customer (required with the `HOTP_AUTH` flow only)
     */
    token: string;
  };

export type CreatePreAuthorizedFundLockFlowPaymentRequest =
  BaseCreatePaymentRequest<"PRE_AUTHORIZED_FUND_LOCK"> & {
    /**
     * Pre-authorization token
     */
    token: string;
  };

export interface CreateMatchCodeFlowPaymentRequest extends BaseCreatePaymentRequest<"MATCH_CODE"> {
  payment_method_options?: PaymentMethodOptions;
  payment_options?: PaymentOptions;
}

export type CreateFundLockFlowPaymentRequest =
  BaseCreatePaymentRequest<"FUND_LOCK">;

export type CreatePaymentRequest =
  | CreateMatchCodeFlowPaymentRequest
  | CreateMatchUserFlowPaymentRequest
  | CreateRefundFlowPaymentRequest
  | CreatePreAuthorizedFlowPaymentRequest
  | CreateHotpAuthFlowPaymentRequest
  | CreatePreAuthorizedFundLockFlowPaymentRequest
  | CreateFundLockFlowPaymentRequest;

/**
 * Parameters of the `payment.refund()` helper
 */
export interface RefundPaymentRequest {
  /** Amount to refund in cents */
  amount_unit: number;
  external_code?: string;
  metadata?: PaymentMetadata;
  callback_url?: string;
}

export interface CreatePaymentResponse extends Omit<
  Payment,
  "daily_closure" | "payment_method"
> {
  /**
   * Redirect url to the payment page
   */
  redirect_url: string;
}
