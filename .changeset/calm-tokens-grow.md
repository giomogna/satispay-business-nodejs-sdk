---
"satispay-business": minor
---

Complete API coverage: `HOTP_AUTH` flow, `token` and `metadata` on payment creation, `payment.refund()`, `payment.listAll()` async pagination, `authorizations` resource (pre-authorized payment tokens), `reports.create()`, `testAuthentication()`, and callback helpers (`parseCallback`, `verifyCallbackDigest`, `verifyCallbackSignature`). Every method accepts `{ idempotencyKey, additionalHeaders, signal }`.
