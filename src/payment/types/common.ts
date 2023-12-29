export interface Payment {
  /**
   * Unique ID of the payment.
   */
  id: string;
  /**
   * Generated code identifier
   */
  code_identifier?: string;
  /**
   * Type of payment
   */
  type: "TO_BUSINESS" | "REFUND_TO_BUSINESS";
  /**
   * Amount of the payment in cents
   */
  amount_unit: number;
  /**
   * Currency of the payment
   */
  currency: string;
  /**
   * Status of the payment
   */
  status: "PENDING" | "ACCEPTED" | "CANCELED" | "AUTHORIZED";
  /**
   * If true, the payment is expired
   */
  expired: boolean;
  /**
   * Additional metadata of the payment
   */
  metadata: any;
  /**
   * The sender actor of the payment
   */
  sender: {
    /**
     * Unique ID of the sender
     */
    id: string;
    /**
     * Type of the actor
     */
    type: "CONSUMER";
    /**
     * Short name of the actor
     */
    name?: string;
  };
  /**
   * The receiver actor of the payment
   */
  receiver: {
    /**
     * Unique ID of the receiver
     */
    id: string;
    /**
     * Type of the actor
     */
    type: "SHOP";
  };
  /**
   * Timestamp of payment insertion
   */
  insert_date: string;
  /**
   * Timestamp of payment expiration
   */
  expire_date: string;
  /**
   * Order ID or payment external identifier
   */
  external_code: string;
  /**
   * The daily closure of the payment
   */
  daily_closure: {
    /**
     * ID of the daily closure
     */
    id: string;
    /**
     * The closure date
     */
    date: string;
  };

  payment_method?: {
    meal_voucher?: {
      amount_unit: number;
      number: number;
    };
  };
}

export interface PaymentMethodOptions {
  meal_voucher?: {
    /**
     * Enable or disable the meal voucher for this payment.
     */
    enable?: boolean;
    /**
     * The maximum amount payable with meal vouchers in cents.
     *
     * This parameter is applicable when a customer purchases both food and non-food items.
     * For instance, while the total grocery bill may amount to €15.00, the specific cost for food items might be of just €6.50.
     * To represent the amount €6.50, you should multiply it by 100, resulting in 650 cents.
     */
    max_amount_unit?: number;
    /**
     * The maximum number of meal vouchers usable for this payment.
     *
     * By default this parameter is set to 8, in compliance with Italian law.
     *
     * This parameter is applicable when a customer intends to make a payment using multiple meal voucher brands.
     * For instance, the customer might use 3 meal vouchers from other brands and 5 meal vouchers from Satispay, resulting in a total of 8 meal vouchers.
     * In the example above, the `max_number` parameter should be set to 5, since 3 meal vouchers are from another brand.
     */
    max_number?: number;
  };
}

export interface PaymentOptions {
  /**
   * Enable or disable partial payments.
   *
   * When partial payment is enabled, customers have the flexibility to pay a portion of the total amount using a meal voucher, without the need to use funds from the Satispay wallet.
   * Customers can decide to use alternative payment methods to cover the remaining amount.
   *
   * When partial payment is disabled, customers are required to pay the entire amount using Satispay, using a combination of both meal vouchers and funds from their Satispay wallet.
   * If the customer has insufficient funds, the transaction will not be successful.
   */
  partial_payment?: boolean;
}
