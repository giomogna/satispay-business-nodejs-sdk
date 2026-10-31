import crypto from "node:crypto";

export interface SignRequestInput {
  method: string;
  /** Request path including the query string */
  path: string;
  host: string;
  date: string;
  /** Exact body string sent over the wire ("" when there is no body) */
  body: string;
  keyId: string;
  /** RSA private key (PEM or parsed `KeyObject`) */
  privateKey: string | crypto.KeyObject;
}

export interface SignedRequest {
  digest: string;
  signingString: string;
  authorization: string;
}

/**
 * Builds the digest, the signing string and the `Authorization` header
 * according to Satispay's HTTP signature scheme.
 *
 * @link https://developers.satispay.com/reference/sign-the-string
 */
export function signRequest({
  method,
  path,
  host,
  date,
  body,
  keyId,
  privateKey,
}: SignRequestInput): SignedRequest {
  const digest = `SHA-256=${crypto
    .createHash("sha256")
    .update(body)
    .digest("base64")}`;

  const signingString = [
    `(request-target): ${method.toLowerCase()} ${path}`,
    `host: ${host}`,
    `date: ${date}`,
    `digest: ${digest}`,
  ].join("\n");

  const signature = crypto
    .createSign("RSA-SHA256")
    .update(signingString)
    .sign(privateKey, "base64");

  const authorization = `Signature keyId="${keyId}", algorithm="rsa-sha256", headers="(request-target) host date digest", signature="${signature}"`;

  return { digest, signingString, authorization };
}
