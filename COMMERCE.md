# DeAlgo agent commerce pilot

Version 0.2 adds financial proposals for purchases, sales, refunds, payouts, and subscriptions. Proposals reserve an allowance and require human review. **APPROVED does not execute a payment.** The separate refund tool retains its existing test-only execution path.

## Connect

1. Sign in as a workspace administrator at [Financial controls](https://dealgo-portal.vercel.app/commerce/control).
2. Create a restricted agent connection and save its one-time key in your application's secret store.
3. Create a mandate for that agent: action, counterparty IDs, currency, per-action limit, total allowance, and expiration. Open proposal intake.
4. Install the release archive:

```sh
npm install ./dealgo-middleware-0.2.0.tgz
```

Use the existing DEALGO_URL and DEALGO_API_KEY environment variables. A commerce key is different from a refund-only key; the server refuses requests outside the credential's scope.

```js
import { DeAlgo } from "@dealgo/middleware";
const dealgo = new DeAlgo({
  url: process.env.DEALGO_URL,
  apiKey: process.env.DEALGO_API_KEY,
});
const { mandates } = await dealgo.listMandates();
// Select the intended mandate by its stored ID, not blindly by array order.
const mandate = mandates.find(m => m.id === process.env.DEALGO_MANDATE_ID);
if (!mandate) throw new Error("Required mandate is unavailable");
const result = await dealgo.propose({
  mandateId: mandate.id,
  action: "purchase",
  counterpartyId: "vendor_acme",
  amountMinor: 2500,
  currency: "usd",
  description: "Office supplies for order PO-1042",
  requestKey: "purchase-order-1042",
});
console.log(result.approvalUrl);
// A later read never resubmits the proposal.
const status = await dealgo.getProposal(result.proposal.id);
console.log(status.proposal.status, status.executionEnabled);
```

Persist the requestKey alongside your own order before sending. Retry an uncertain submission using that same key and exact terms. A changed amount or counterparty needs a new business request. Do not generate a new key merely because a connection timed out.

## MCP

For a global installation, run `dealgo-middleware doctor-commerce` for a read-only connection check, or `dealgo-middleware mcp-commerce` for the stdio server. Configure the same environment variables in your MCP host. This server exposes:

- dealgo_list_mandates
- dealgo_propose_deal
- dealgo_proposal_status

It contains no approval, payment execution, billing, merchant connection, or raw Stripe tool. Agent-to-agent negotiation can produce a proposed deal, but messages and negotiations never grant spending authority. This is not a certified A2A/AP2 implementation.

## Direct HTTP

POST /api/v1/commerce/proposals with a Bearer connection key, Content-Type application/json, and an Idempotency-Key header. The JSON fields match the JavaScript example except requestKey, which is carried in the header. GET /api/v1/commerce/mandates and GET /api/v1/commerce/proposals/:id are read-only.

Amounts are positive integers in the currency's minor units. USD 2500 means $25; currencies do not all use two decimal places. Never submit payment-card data, passwords, bank credentials, tax IDs, or identity documents in descriptions.

## Current boundaries

Collection reads return the latest 100 records. Reservations include pending and approved proposals; rejecting or cancelling an unexecuted proposal releases its reservation. Expired/revoked mandates cannot approve pending requests, but reservations remain until cancellation. The workspace pause affects this commerce control path only. Keep direct payment credentials away from agents and remove any bypass tool from the agent environment.

Commerce records are append-only application records, not independently signed settlement receipts. General live financial execution, production acceptance, operational support commitments, and provider onboarding must be completed before a live-money rollout.
