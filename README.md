# Satispay Business Node.js SDK

Unofficial TypeScript SDK for the [Satispay GBusiness API](https://developers.satispay.com/reference). Zero runtime dependencies, ESM-only, fully typed.

## Requirements

Node.js `>= 22.12`. The package is ESM-only and can also be loaded with `require()`.

## Install

```bash
npm install satispay-business
# or
pnpm add satispay-business
```

## Setup

### 1. Generate keys and obtain the KeyId

With the activation code from the Satispay Business dashboard (one-time use; sandbox codes come from Satispay):

```bash
npx satispay-business keygen --token 6N3ECU --env staging --env-file .env
```

This generates a 4096-bit RSA key pair (`private.pem`, `public.pem`), [obtains the KeyId](https://developers.satispay.com/reference/keyid) and appends `SATISPAY_KEY_ID` and `SATISPAY_PRIVATE_KEY` to `.env`. Without `--env-file` the two lines are printed instead.

- Existing keys: `--private-key private.pem` (optionally `--public-key public.pem`)
- `--out-dir <dir>` to choose where keys are written; existing files are never overwritten without `--force`
- Production asks for confirmation (or pass `--yes`)

Run `npx satispay-business --help` for all options.

### 2. Or do it manually

[Generate a key pair](https://developers.satispay.com/reference/generate-rsa-keys):

```bash
openssl genrsa -out private.pem 4096
openssl rsa -in private.pem -outform PEM -pubout -out public.pem
```

Then obtain the KeyId:

```ts
import { readFileSync } from "node:fs";
import { Satispay } from "satispay-business";

const { key_id } = await Satispay.obtainKeyId(
  readFileSync("public.pem", "utf8"),
  "ACTIVATION_TOKEN",
  "staging",
);
```

### 3. Create the client

```ts
const satispay = new Satispay({
  keyId: process.env.SATISPAY_KEY_ID,
  privateKey: process.env.SATISPAY_PRIVATE_KEY, // PEM, base64-encoded PEM, or PEM with escaped "\n"
  environment: "staging", // default: "production"
  timeout: 10_000, // optional, ms
});
```

`keyId` and `privateKey` default to the `SATISPAY_KEY_ID` and `SATISPAY_PRIVATE_KEY` environment variables. Never commit keys.

Check that signing works (sandbox only):

```ts
const { valid } = await satispay.testAuthentication();
```

## Usage

Every method takes an optional last argument `{ idempotencyKey, additionalHeaders, signal }`.

### Payments

```ts
// One-off (QR / web redirect)
const payment = await satispay.payment.create(
  {
    flow: "MATCH_CODE",
    amount_unit: 1000, // cents
    currency: "EUR",
    external_code: "order-123",
    callback_url: "https://example.com/satispay/callback?payment_id={uuid}",
    redirect_url: "https://example.com/thank-you",
  },
  { idempotencyKey: "order-123" },
);

// Automatic payment with a pre-authorized token
await satispay.payment.create({
  flow: "PRE_AUTHORIZED",
  token: authorizationId,
  amount_unit: 500,
  currency: "EUR",
});

await satispay.payment.get(payment.id);
await satispay.payment.update(payment.id, { action: "ACCEPT" }); // FUND_LOCK flows
await satispay.payment.refund(payment.id, { amount_unit: 1000 });

const page = await satispay.payment.list({ status: "ACCEPTED", limit: 50 });
for await (const p of satispay.payment.listAll({ status: "ACCEPTED" })) {
  console.log(p.id);
}
```

Supported flows: `MATCH_CODE`, `MATCH_USER` (deprecated), `REFUND`, `PRE_AUTHORIZED`, `FUND_LOCK`, `PRE_AUTHORIZED_FUND_LOCK`, `HOTP_AUTH`.

### Authorizations (pre-authorized payment tokens)

```ts
const auth = await satispay.authorizations.create({
  reason: "Monthly subscription",
  callback_url: "https://example.com/satispay/auth?authorization_id={uuid}",
  redirect_url: "https://example.com/done",
});
await satispay.authorizations.get(auth.id);
await satispay.authorizations.cancel(auth.id);
```

### Daily closure

```ts
await satispay.shop.getDailyClosure(new Date()); // or "20240131"
```

### Reports

Requires a dedicated KeyId enabled by Satispay.

```ts
await satispay.reports.create({
  type: "PAYMENT_FEE",
  format: "CSV",
  query_type: "PAYMENT_DATE_INTERVAL",
  query_payload: {
    payment_date_from: "2024-01-01",
    payment_date_to: "2024-01-31",
  },
  notification: { email_cc_list: ["accounting@example.com"] },
});
```

### Consumers (deprecated)

```ts
const consumer = await satispay.consumers.get("+393331234567");
```

## Callbacks

Satispay calls your `callback_url` with a `GET` when a payment or authorization changes state. The callback carries no status: read the id, then fetch the resource.

```ts
import { parseCallback, verifyCallbackDigest } from "satispay-business";

app.get("/satispay/callback", async (req, res) => {
  const id = parseCallback(req.url, "payment_id");
  if (!id) return res.sendStatus(400);
  const payment = await satispay.payment.get(id);
  // update your order from payment.status
  res.sendStatus(200);
});
```

`verifyCallbackDigest` and `verifyCallbackSignature` are available when your integration sends signed callbacks.

## Errors

Non-2xx responses throw a `SatispayError`:

```ts
import { SatispayError } from "satispay-business";

try {
  await satispay.payment.get("missing");
} catch (e) {
  if (e instanceof SatispayError) {
    console.error(e.status, e.code, e.message, e.wlt); // share `wlt` with Satispay support
  }
}
```

## License

ISC
