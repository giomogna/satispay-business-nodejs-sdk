---
"satispay-business": major
---

ESM-only package requiring Node.js >= 22.12 (still loadable via `require()`); zero runtime dependencies (`date-fns` removed). Errors are now thrown as `SatispayError` with `status`, `code` and `wlt`. `privateKey` and `publicKey` accept PEM, base64-encoded PEM or PEM with escaped newlines. New client options `fetch` and `timeout`.
