import type { Satispay } from "./satispay";
import type { RequestOptions } from "./types/request";

export type AuthenticationKeyRole = "ONLINE_SHOP" | "DEVICE" | "PUBLIC";

export interface TestAuthenticationResponse {
  authentication_key: {
    role: AuthenticationKeyRole;
    access_key?: string;
    customer_uid?: string;
    key_type?: string;
    auth_type?: string;
    enable?: boolean;
    insert_date?: string;
    version?: number;
  };
  signature: {
    key_id: string;
    algorithm: string;
    headers: string[];
    signature: string;
    resign_required: boolean;
    iteration_count: number;
    valid: boolean;
  };
  signed_string: string;
}

export interface TestAuthenticationResult extends TestAuthenticationResponse {
  /** `true` when the key was recognized (role is not `PUBLIC`) and the signature is valid */
  valid: boolean;
}

/**
 * Tests that your keyId / private key produce a valid signature.
 * Only available on the staging environment. Sends no request body.
 *
 * @link https://developers.satispay.com/reference/testinput
 */
export async function testAuthentication(
  satispay: Satispay,
  options?: RequestOptions,
): Promise<TestAuthenticationResult> {
  const response = await satispay.post<TestAuthenticationResponse>(
    "/wally-services/protocol/tests/signature",
    { ...options },
  );
  return {
    ...response,
    valid:
      response.authentication_key?.role !== "PUBLIC" &&
      response.signature?.valid === true,
  };
}
