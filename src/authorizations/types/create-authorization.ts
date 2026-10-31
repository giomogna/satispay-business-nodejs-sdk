import type { Authorization } from "./common";

export interface CreateAuthorizationRequest {
  /** The reason why the token is being requested */
  reason?: string;
  /**
   * URL called with an HTTP GET if the authorization status changes.
   * `{uuid}` is replaced with the authorization token id.
   */
  callback_url?: string;
  /** URL the user is redirected to after the authorization flow */
  redirect_url?: string;
  /**
   * Arbitrary info. The `phone_number` key pre-fills the user's mobile number.
   */
  metadata?: { phone_number?: string; [key: string]: unknown };
}

export type CreateAuthorizationResponse = Authorization;
