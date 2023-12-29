import type { Payment, PaymentMethodOptions, PaymentOptions } from "./common";

export interface UpdatePaymentRequest {
  /**
   * The update action to perform
   */
  action: "ACCEPT" | "CANCEL" | "CANCEL_OR_REFUND";
  /**
   * Amount of the payment in cents when using the FUND_LOCK flow
   */
  amount_unit?: number;

  payment_method_options?: PaymentMethodOptions;

  payment_options?: PaymentOptions;
}

export interface UpdatePaymentResponse
  extends Omit<Payment, "daily_closure" | "payment_method"> {}
