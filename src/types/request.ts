export interface AdditionalHeaders {
  /**
   * Info about the device
   */
  "x-satispay-deviceinfo"?: string;
  /**
   * Device type
   */
  "x-satispay-devicetype"?:
    | "SMARTPHONE"
    | "TABLET"
    | "CASH-REGISTER"
    | "POS"
    | "PC"
    | "ECOMMERCE_PLUGIN";
  /**
   * Operative System name
   */
  "x-satispay-os"?: string;
  /**
   * Operative System version
   */
  "x-satispay-osv"?: string;
  /**
   * Software house name
   */
  "x-satispay-apph"?: string;
  /**
   * Software name
   */
  "x-satispay-appn"?: string;
  /**
   * Software version
   */
  "x-satispay-appv"?: string;
  /**
   * Tracking code used by Satispay commercial partners
   */
  "x-satispay-tracking-code"?: string;
}

export interface RequestOptions extends Pick<RequestInit, "signal"> {
  /**
   * The idempotent token of the request
   *
   * @link https://developers.satispay.com/reference/idempotency
   */
  idempotencyKey?: string;
  additionalHeaders?: AdditionalHeaders;
}
