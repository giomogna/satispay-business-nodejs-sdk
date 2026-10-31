import type { KeyObject } from "node:crypto";
import { version } from "../package.json";
import { testAuthentication, type TestAuthenticationResult } from "./auth-test";
import { Authorizations } from "./authorizations/authorizations";
import { Consumers } from "./consumers/consumers";
import { SatispayError } from "./errors";
import { Payment } from "./payment/payment";
import { Reports } from "./reports/reports";
import { Shop } from "./shop/shop";
import type { InternalRequestOptions, RequestOptions } from "./types/request";
import { getFormattedCurrentDate } from "./utils/date";
import { loadPrivateKey, toPublicKeyPem } from "./utils/keys";
import { signRequest } from "./utils/signature";

export type Environment = "staging" | "production";

export interface InitOptions {
  /**
   * RSA private key, as a PEM string or a base64-encoded PEM.
   * Defaults to `process.env.SATISPAY_PRIVATE_KEY`.
   */
  privateKey?: string;
  /**
   * Key ID obtained via `Satispay.obtainKeyId`.
   * Defaults to `process.env.SATISPAY_KEY_ID`.
   */
  keyId?: string;
  /**
   * Target environment (default: `production`)
   */
  environment?: Environment;
  /**
   * Overrides the base URL derived from `environment`
   */
  baseUrl?: string;
  /**
   * Custom `fetch` implementation (defaults to the global `fetch`)
   */
  fetch?: typeof fetch;
  /**
   * Request timeout in milliseconds. No timeout by default.
   */
  timeout?: number;
}

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

const BASE_URL_MAP: Record<Environment, string> = {
  staging: "https://staging.authservices.satispay.com",
  production: "https://authservices.satispay.com",
};

function buildQueryString(query?: InternalRequestOptions["query"]): string {
  if (!query) return "";
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(
    query as Record<string, string | number | boolean | null | undefined>,
  )) {
    if (value === undefined || value === null) continue;
    params.append(key, String(value));
  }
  const str = params.toString();
  return str ? `?${str}` : "";
}

function combineSignals(
  signal: AbortSignal | undefined,
  timeout: number | undefined,
): AbortSignal | undefined {
  const signals: AbortSignal[] = [];
  if (signal) signals.push(signal);
  if (timeout !== undefined) signals.push(AbortSignal.timeout(timeout));
  if (signals.length === 0) return undefined;
  if (signals.length === 1) return signals[0];
  if (typeof AbortSignal.any === "function") return AbortSignal.any(signals);

  // Fallback for runtimes without AbortSignal.any
  const controller = new AbortController();
  for (const s of signals) {
    if (s.aborted) {
      controller.abort(s.reason);
      break;
    }
    s.addEventListener("abort", () => controller.abort(s.reason), {
      once: true,
    });
  }
  return controller.signal;
}

export class Satispay {
  private readonly keyId: string;
  private readonly privateKey: KeyObject;
  private readonly environment: Environment;
  private readonly baseUrl: string;
  private readonly host: string;
  private readonly fetchImpl: typeof fetch;
  private readonly timeout?: number;

  readonly consumers = new Consumers(this);
  readonly payment = new Payment(this);
  readonly shop = new Shop(this);
  readonly authorizations = new Authorizations(this);
  readonly reports = new Reports(this);

  constructor({
    privateKey = process.env.SATISPAY_PRIVATE_KEY,
    keyId = process.env.SATISPAY_KEY_ID,
    environment = "production",
    baseUrl,
    fetch: fetchImpl,
    timeout,
  }: InitOptions = {}) {
    if (!keyId) {
      throw new Error("Missing keyId");
    }
    this.keyId = keyId;

    if (!privateKey) {
      throw new Error("Missing privateKey");
    }
    this.privateKey = loadPrivateKey(privateKey);

    this.environment = environment;
    this.baseUrl = (baseUrl ?? BASE_URL_MAP[environment]).replace(/\/+$/, "");
    this.host = new URL(this.baseUrl).host;
    this.fetchImpl = fetchImpl ?? ((...args) => globalThis.fetch(...args));
    this.timeout = timeout;
  }

  /** @internal */
  async request<T>(
    method: HttpMethod,
    path: string,
    {
      body,
      query,
      idempotencyKey,
      additionalHeaders,
      signal,
    }: InternalRequestOptions = {},
  ): Promise<T> {
    const fullPath = `${path}${buildQueryString(query)}`;
    const bodyString = body === undefined ? undefined : JSON.stringify(body);
    const date = getFormattedCurrentDate();

    const { digest, authorization } = signRequest({
      method,
      path: fullPath,
      host: this.host,
      date,
      body: bodyString ?? "",
      keyId: this.keyId,
      privateKey: this.privateKey,
    });

    const headers = new Headers({
      "x-satispay-appn": "satispay-node",
      "x-satispay-appv": version,
      ...additionalHeaders,
      Accept: "application/json",
    });
    if (bodyString !== undefined) {
      headers.set("Content-Type", "application/json");
    }
    if (idempotencyKey) {
      headers.set("Idempotency-Key", idempotencyKey);
    }
    headers.set("Authorization", authorization);
    headers.set("Date", date);
    headers.set("Digest", digest);

    const response = await this.fetchImpl(`${this.baseUrl}${fullPath}`, {
      method,
      headers,
      body: bodyString,
      signal: combineSignals(signal, this.timeout),
    });

    if (!response.ok) {
      throw await SatispayError.fromResponse(response);
    }

    return (await response.json()) as T;
  }

  /** @internal */
  async get<T>(
    path: string,
    options: Omit<InternalRequestOptions, "body"> = {},
  ): Promise<T> {
    return this.request<T>("GET", path, options);
  }

  /** @internal */
  async post<T>(
    path: string,
    options: InternalRequestOptions = {},
  ): Promise<T> {
    return this.request<T>("POST", path, options);
  }

  /** @internal */
  async put<T>(path: string, options: InternalRequestOptions = {}): Promise<T> {
    return this.request<T>("PUT", path, options);
  }

  /** @internal */
  async patch<T>(
    path: string,
    options: InternalRequestOptions = {},
  ): Promise<T> {
    return this.request<T>("PATCH", path, options);
  }

  /** @internal */
  async delete<T>(
    path: string,
    options: InternalRequestOptions = {},
  ): Promise<T> {
    return this.request<T>("DELETE", path, options);
  }

  /**
   * Exchanges a one-time activation token (generated from the Satispay
   * Business dashboard) and your public key for a `key_id`.
   *
   * @param publicKey RSA public key, as a PEM string or a base64-encoded PEM
   * @param token Activation token
   *
   * @link https://developers.satispay.com/reference/obtain-keyid
   */
  /**
   * Verifies that requests are signed correctly (sandbox only)
   *
   * @link https://developers.satispay.com/reference/testinput
   */
  async testAuthentication(
    options?: RequestOptions,
  ): Promise<TestAuthenticationResult> {
    return testAuthentication(this, options);
  }

  static async obtainKeyId(
    publicKey: string,
    token: string,
    environment: Environment = "production",
    {
      fetch: fetchImpl,
      signal,
    }: Pick<InitOptions, "fetch"> & Pick<RequestOptions, "signal"> = {},
  ): Promise<{ key_id: string }> {
    const baseUrl = BASE_URL_MAP[environment];

    const response = await (fetchImpl ?? globalThis.fetch)(
      `${baseUrl}/g_business/v1/authentication_keys`,
      {
        method: "POST",
        headers: new Headers({
          "Content-Type": "application/json",
          Accept: "application/json",
        }),
        body: JSON.stringify({
          public_key: toPublicKeyPem(publicKey),
          token,
        }),
        signal,
      },
    );

    if (!response.ok) {
      throw await SatispayError.fromResponse(response);
    }

    return (await response.json()) as { key_id: string };
  }
}
