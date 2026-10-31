import crypto from "node:crypto";
import { normalizePem } from "./keys";

/**
 * Helpers for Satispay server-to-server callbacks.
 *
 * Satispay calls your `callback_url` with an HTTP GET, replacing `{uuid}` with
 * the payment (or authorization / report) id. The callback only signals that
 * something changed: it does NOT carry the status. A `Digest` header is always
 * present; an `Authorization` signature is present only for some integrations
 * (it depends on your configuration, ask Satispay support).
 *
 * Recommended pattern: read the id with `parseCallback`, fetch the payment via
 * the API, and trust that response rather than the callback request.
 *
 * @link https://developers.satispay.com/reference/callback-s2s
 */

/**
 * Extracts the resource id from the callback URL (or path with query).
 * Returns `undefined` when the parameter is missing or empty.
 */
export function parseCallback(
  url: string | URL,
  paramName = "payment_id",
): string | undefined {
  const parsed =
    typeof url === "string" ? new URL(url, "http://localhost") : url;
  const value = parsed.searchParams.get(paramName);
  return value === null || value === "" ? undefined : value;
}

/**
 * Verifies the `Digest` header (`SHA-256=<base64>`) against the raw body.
 * An empty body (typical for GET callbacks) is supported.
 */
export function verifyCallbackDigest(
  body: string | Buffer | undefined | null,
  digestHeader: string | null | undefined,
): boolean {
  if (!digestHeader) return false;
  const expected = `SHA-256=${crypto
    .createHash("sha256")
    .update(body ?? "")
    .digest("base64")}`;
  const a = Buffer.from(expected);
  const b = Buffer.from(digestHeader.trim());
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export interface VerifyCallbackSignatureInput {
  /** HTTP method of the callback (usually `GET`) */
  method: string;
  /** Request path including the query string, as received */
  path: string;
  /** Incoming headers; lookup is case-insensitive */
  headers: Record<string, string | string[] | undefined> | Headers;
  /** Satispay public key (PEM or base64-encoded PEM) */
  publicKey: string;
}

function getHeader(
  headers: VerifyCallbackSignatureInput["headers"],
  name: string,
): string | undefined {
  if (typeof Headers !== "undefined" && headers instanceof Headers) {
    return headers.get(name) ?? undefined;
  }
  for (const [key, value] of Object.entries(
    headers as Record<string, string | string[] | undefined>,
  )) {
    if (key.toLowerCase() === name) {
      return Array.isArray(value) ? value.join(", ") : value;
    }
  }
  return undefined;
}

/**
 * Verifies the `Authorization: Signature ...` header of a callback with
 * Satispay's public key (rsa-sha256). The signing string is rebuilt from the
 * `headers="..."` list declared in the header itself.
 *
 * This does not check the `Digest` against the body nor the `Date` freshness:
 * combine with `verifyCallbackDigest` and a date check if needed.
 */
export function verifyCallbackSignature({
  method,
  path,
  headers,
  publicKey,
}: VerifyCallbackSignatureInput): boolean {
  const authorization = getHeader(headers, "authorization");
  if (!authorization || !/^Signature\s/i.test(authorization)) return false;

  const params: Record<string, string> = {};
  for (const m of authorization
    .replace(/^Signature\s+/i, "")
    .matchAll(/(\w+)="([^"]*)"/g)) {
    params[m[1]!] = m[2]!;
  }

  const { signature, headers: headerList } = params;
  const algorithm = params.algorithm?.toLowerCase();
  if (!signature || !headerList) return false;
  if (algorithm && algorithm !== "rsa-sha256") return false;

  const lines: string[] = [];
  for (const name of headerList.toLowerCase().split(/\s+/).filter(Boolean)) {
    if (name === "(request-target)") {
      lines.push(`(request-target): ${method.toLowerCase()} ${path}`);
    } else {
      const value = getHeader(headers, name);
      if (value === undefined) return false;
      lines.push(`${name}: ${value}`);
    }
  }

  try {
    return crypto
      .createVerify("RSA-SHA256")
      .update(lines.join("\n"))
      .verify(normalizePem(publicKey), signature, "base64");
  } catch {
    return false;
  }
}
