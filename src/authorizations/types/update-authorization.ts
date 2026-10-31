import type { Authorization } from "./common";

export interface UpdateAuthorizationRequest {
  /** The status update to perform */
  status?: "CANCELED";
  /** Unique ID of the consumer used to bind the token */
  consumer_uid?: string;
  /** Additional data to store */
  metadata?: Record<string, unknown>;
}

export type UpdateAuthorizationResponse = Authorization;
