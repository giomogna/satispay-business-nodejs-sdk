# satispay-business

## 1.0.0-next.4

### Major Changes

- 6cc4bef: ESM-only package requiring Node.js >= 22.12 (still loadable via `require()`); zero runtime dependencies (`date-fns` removed). Errors are now thrown as `SatispayError` with `status`, `code` and `wlt`. `privateKey` and `publicKey` accept PEM, base64-encoded PEM or PEM with escaped newlines. New client options `fetch` and `timeout`.

### Minor Changes

- 6cc4bef: Complete API coverage: `HOTP_AUTH` flow, `token` and `metadata` on payment creation, `payment.refund()`, `payment.listAll()` async pagination, `authorizations` resource (pre-authorized payment tokens), `reports.create()`, `testAuthentication()`, and callback helpers (`parseCallback`, `verifyCallbackDigest`, `verifyCallbackSignature`). Every method accepts `{ idempotencyKey, additionalHeaders, signal }`.
- 6cc4bef: Add the `satispay-business keygen` CLI: generates an RSA key pair (or reuses yours), obtains the KeyId and outputs `SATISPAY_KEY_ID` / `SATISPAY_PRIVATE_KEY`, optionally appending them to an env file.

## 0.1.0-next.3

### Minor Changes

- d29404c: Add `getDailyClosure` API

## 0.1.0-next.2

### Patch Changes

- 61cebc4: Fix obtainKeyId key

## 0.1.0-next.1

### Patch Changes

- df03c1d: Fix obtainKeyId method

## 0.1.0-next.0

### Minor Changes

- 1857d6a: Initial version
