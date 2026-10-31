import crypto from "node:crypto";

/**
 * Normalizes a key to PEM format.
 *
 * Accepts a PEM string, a base64-encoded PEM, or a PEM whose newlines were
 * escaped as `\n` (common when stored in environment variables).
 */
export function normalizePem(key: string): string {
  let value = key.trim();

  if (!value.includes("-----BEGIN")) {
    value = Buffer.from(value, "base64").toString("utf8").trim();
  }

  value = value.replace(/\\r\\n|\\n/g, "\n").replace(/\r\n/g, "\n");

  if (!value.includes("-----BEGIN")) {
    throw new Error(
      "Invalid key: expected a PEM string or a base64-encoded PEM",
    );
  }

  return value;
}

/**
 * Parses and validates an RSA private key (PKCS#1 or PKCS#8 PEM, optionally
 * base64-encoded or with escaped newlines).
 *
 * @link https://developers.satispay.com/reference/generate-rsa-keys
 */
export function loadPrivateKey(key: string): crypto.KeyObject {
  let keyObject: crypto.KeyObject;
  try {
    keyObject = crypto.createPrivateKey(normalizePem(key));
  } catch (cause) {
    throw new Error("Invalid privateKey: expected an RSA private key PEM", {
      cause,
    });
  }
  if (keyObject.asymmetricKeyType !== "rsa") {
    throw new Error(
      `Invalid privateKey: expected an RSA key, got ${keyObject.asymmetricKeyType}`,
    );
  }
  return keyObject;
}

/**
 * Returns the public key as the SPKI PEM (`-----BEGIN PUBLIC KEY-----`)
 * expected by the KeyId API. Also accepts PKCS#1 public keys.
 *
 * @link https://developers.satispay.com/reference/keyid
 */
export function toPublicKeyPem(key: string): string {
  let keyObject: crypto.KeyObject;
  try {
    keyObject = crypto.createPublicKey(normalizePem(key));
  } catch (cause) {
    throw new Error("Invalid publicKey: expected an RSA public key PEM", {
      cause,
    });
  }
  if (keyObject.asymmetricKeyType !== "rsa") {
    throw new Error(
      `Invalid publicKey: expected an RSA key, got ${keyObject.asymmetricKeyType}`,
    );
  }
  return (keyObject.export({ type: "spki", format: "pem" }) as string).trim();
}
