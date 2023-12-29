# Satispay Business Node.js SDK

Node.js library for the Satispay Business API.

## Install

```bash
npm install satispay-business
# or
yarn add satispay-business
# or
pnpm add satispay-business
# or
bun install satispay-business
```

## Setup

### [Generate a key pair](https://developers.satispay.com/reference/generate-rsa-keys)

```bash
openssl genrsa -out private.pem 4096
openssl rsa -in private.pem -outform PEM -pubout -out public.pem
```

```js
import { Satispay } from "satispay-business";

const satispay = new Satispay({
  privateKey: "base64-encoded-private-key",
  keyId: "key-id",
});
```

## Usage

### Consumers

#### Get consumer

```js
const consumer = await satispay.consumer.get("+393331234567");
```

### Payments

#### Create payment

```js
await satispay.payment.create({
  amount_unit: 10 * 100,
  currency: "EUR",
  flow: "MATCH_CODE",
  redirect_url: "https://example.com/redirect",
  callbackUrl: "https://example.com/webkook?payment_id={uuid}",
});
```

#### Get payment

```js
const payment = await satispay.payment.get("payment-id");
```
