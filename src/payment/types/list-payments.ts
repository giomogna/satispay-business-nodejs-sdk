import type { Payment } from "./common";

export interface ListPaymentsRequest {
  /**
   * Filter by the payment status ACCEPTED, PENDING or CANCELED. If the status is not passed, only accepted payments will be returned
   */
  status?: "ACCEPTED" | "PENDING" | "CANCELED";
  /**
   * A limit on the number of objects to be returned, between 1 and 100
   */
  limit?: string;
  /**
   * Is the id that defines your place in the list when you make a payment list request
   */
  starting_after?: string;
  /**
   * Is the timestamp (in milliseconds) that defines your place in the list when you make a payment list request
   */
  starting_after_timestamp?: string;
}

export interface ListPaymentsResponse {
  /**
   * Are there more items in the list?
   */
  has_more: boolean;

  data: Payment[];
}
