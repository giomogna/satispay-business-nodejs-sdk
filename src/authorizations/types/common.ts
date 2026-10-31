export type AuthorizationStatus = "PENDING" | "ACCEPTED" | "CANCELED";

export interface Authorization {
  /** Unique ID of the authorization token */
  id: string;
  /** Generated code identifier containing the authorization details */
  code_identifier?: string;
  /** Unique ID of the consumer (present once bound to a consumer) */
  consumer_uid?: string;
  /** Unique ID of the shop */
  shop_uid?: string;
  status: AuthorizationStatus;
  /** The reason why the token has been requested */
  reason?: string;
  /** URL notified when the status changes */
  callback_url?: string;
  /** Redirect URL to the authorization page (returned on creation) */
  redirect_url?: string;
  /** Metadata inserted within the authorization request */
  metadata?: Record<string, unknown>;
}
