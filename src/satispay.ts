import crypto from "node:crypto";
import { version } from "../package.json";
import { Consumers } from "./consumers/consumers";
import { Payment } from "./payment/payment";
import type { RequestOptions } from "./types/request";
import { getFormattedCurrentDate } from "./utils/date";
import { base64ToPem } from "./utils/decode-base64";

interface InitOptions {
  privateKey?: string;
  keyId?: string;
  environment?: "staging" | "production";
  baseUrl?: string;
}

const BASE_URL_MAP = {
  staging: "https://staging.authservices.satispay.com",
  production: "https://authservices.satispay.com",
};

export class Satispay {
  private readonly keyId: string;
  private readonly privateKey: string;
  private readonly environment: "staging" | "production";
  private readonly baseUrl: string;

  readonly consumers = new Consumers(this);
  readonly payment = new Payment(this);

  constructor({
    privateKey = process.env.SATISPAY_PRIVATE_KEY,
    keyId = process.env.SATISPAY_KEY_ID,
    environment = "production",
    baseUrl,
  }: InitOptions = {}) {
    if (!keyId) {
      throw new Error("Missing keyId");
    }
    this.keyId = keyId;

    if (!privateKey) {
      throw new Error("Missing privateKey");
    }
    this.privateKey = privateKey;

    this.environment = environment;
    this.baseUrl = baseUrl ?? BASE_URL_MAP[environment];
  }

  protected getHeaders(
    path: string,
    method: string,
    body?: any,
    additionalHeaders?: Record<string, string>
  ): Headers {
    const headers = new Headers({
      "x-satispay-appn": "satispay-node",
      "x-satispay-appv": version,
      ...additionalHeaders,
      "Content-Type": "application/json",
      Accept: "application/json",
    });

    const date = getFormattedCurrentDate();
    const bodyString = body ? JSON.stringify(body) : "";
    const digest = crypto
      .createHash("sha256")
      .update(bodyString)
      .digest("base64");
    const signature = `(request-target): ${method.toLowerCase()} ${path}
host: ${this.baseUrl.replace("https://", "")}
date: ${date}
digest: SHA-256=${digest}`;
    const signedSignature = crypto
      .createSign("RSA-SHA256")
      .update(signature)
      .sign(this.privateKey, "base64");
    const authorizationHeader = `Signature keyId="${this.keyId}",algorithm="rsa-sha256",headers="(request-target) host date digest",signature="${signedSignature}"`;

    headers.set("Authorization", authorizationHeader);
    headers.set("Date", date);
    headers.set("Digest", `SHA-256=${digest}`);

    return headers;
  }

  async fetchRequest<T>(
    path: string,
    {
      method,
      body,
      additionalHeaders,
      idempotencyKey,
      ...options
    }: RequestOptions & Pick<RequestInit, "method"> & { body?: any }
  ): Promise<T> {
    const headers = this.getHeaders(path, method ?? "GET", body, {
      ...additionalHeaders,
      ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : undefined),
    });

    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      method,
      body: JSON.stringify(body),
      headers,
    });
    if (!response.ok) {
      throw new Error(response.statusText);
    }
    return response.json();
  }

  async get<T>(path: string, options: RequestOptions = {}): Promise<T> {
    return this.fetchRequest(path, { ...options, method: "GET" });
  }

  async post<T>(
    path: string,
    options: RequestOptions & { body?: any } = {}
  ): Promise<T> {
    return this.fetchRequest(path, { ...options, method: "POST" });
  }

  async put<T>(
    path: string,
    options: RequestOptions & { body?: any } = {}
  ): Promise<T> {
    return this.fetchRequest(path, { ...options, method: "PUT" });
  }

  static async obtainKeyId(
    privateKey: string,
    token: string,
    environment: "staging" | "production" = "production"
  ): Promise<{ key_id: string }> {
    const baseUrl = BASE_URL_MAP[environment];

    const response = await fetch(
      `${baseUrl}/g_business/v1/authentication_keys`,
      {
        headers: new Headers({
          "Content-Type": "application/json",
          Accept: "application/json",
        }),
        body: JSON.stringify({
          private_key: base64ToPem(privateKey),
          token,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(JSON.stringify(await response.json(), null, 2));
    }

    return response.json();
  }
}
