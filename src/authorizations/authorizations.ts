import type { Satispay } from "../satispay";
import type { RequestOptions } from "../types/request";
import type {
  CreateAuthorizationRequest,
  CreateAuthorizationResponse,
  GetAuthorizationResponse,
  UpdateAuthorizationRequest,
  UpdateAuthorizationResponse,
} from "./types";

/**
 * Pre-authorized payment tokens, used by Automatic Payments and
 * Automatic Funds Lock flows.
 */
export class Authorizations {
  private apiPath = "/g_business/v1/pre_authorized_payment_tokens";

  constructor(private readonly satispay: Satispay) {}

  /**
   * API to request a new pre-authorized payment token
   *
   * @link https://developers.satispay.com/reference/create-authorization
   */
  async create(
    data: CreateAuthorizationRequest = {},
    options?: RequestOptions,
  ) {
    return this.satispay.post<CreateAuthorizationResponse>(this.apiPath, {
      ...options,
      body: data,
    });
  }

  /**
   * API to get the details of a pre-authorized payment token
   *
   * @link https://developers.satispay.com/reference/get-authorization
   */
  async get(id: string, options?: RequestOptions) {
    return this.satispay.get<GetAuthorizationResponse>(
      `${this.apiPath}/${encodeURIComponent(id)}`,
      options,
    );
  }

  /**
   * API to update a pre-authorized payment token (cancel it, bind a
   * consumer or change metadata)
   *
   * @link https://developers.satispay.com/reference/update-authorization
   */
  async update(
    id: string,
    data: UpdateAuthorizationRequest,
    options?: RequestOptions,
  ) {
    return this.satispay.put<UpdateAuthorizationResponse>(
      `${this.apiPath}/${encodeURIComponent(id)}`,
      { ...options, body: data },
    );
  }

  /**
   * Cancels (revokes) a pre-authorized payment token
   *
   * @link https://developers.satispay.com/reference/update-authorization
   */
  async cancel(id: string, options?: RequestOptions) {
    return this.update(id, { status: "CANCELED" }, options);
  }
}
