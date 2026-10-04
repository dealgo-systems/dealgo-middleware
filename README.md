# DeAlgo middleware pilot

[Try the simulated walkthrough](https://dealgo-portal.vercel.app/agent-refunds) · [Evaluate the pilot](PILOT.md) · [Request a pilot discussion](https://github.com/dealgo-systems/dealgo-middleware/issues/new?template=pilot.yml)

Install the prerelease artifact directly:

```sh
npm install --global https://github.com/dealgo-systems/dealgo-middleware/releases/download/v0.1.0/dealgo-middleware-0.1.0.tgz
```

This repository contains only the MIT-licensed client and MCP adapter. It requires a separately configured DeAlgo pilot server; it is not a standalone payment processor or a public hosted service signup.

Connect an agent to operator-approved Stripe test refunds. This package contains a JavaScript client, a read-only connection check, and an MCP adapter. The adapter never holds a Stripe credential and exposes no approval or provider-dispatch tool.

This is an installable pilot artifact, not a package published on the npm registry. Node.js 20 or newer is required. Use a configured DeAlgo pilot Portal and payments already recorded in that workspace. The public walkthrough is simulated; it does not create a real request.

## Connect in three steps

1. Open your Portal's `/v3/refund-requests` page as a workspace administrator. Click **Create restricted agent connection**. Save the one-time key. It can only request refunds and read payment/request status; revoke it from the Portal's API Keys page when finished.
2. Download `dealgo-middleware-0.1.0.tgz` from the middleware page. Install it and check the connection:

```sh
npm install --global ./dealgo-middleware-0.1.0.tgz
export DEALGO_URL="https://YOUR-PILOT-PORTAL"
export DEALGO_API_KEY="YOUR-RESTRICTED-CONNECTION-KEY"
dealgo-middleware doctor
```

PowerShell environment variables:

```powershell
$env:DEALGO_URL = "https://YOUR-PILOT-PORTAL"
$env:DEALGO_API_KEY = "YOUR-RESTRICTED-CONNECTION-KEY"
dealgo-middleware doctor
```

`doctor` makes one authenticated read. A successful connection with zero recorded payments means the workspace needs a governed test payment before it can request a refund.

3. Run `dealgo-middleware config`. Merge the generated `dealgo` entry into your MCP client's configuration and replace the two placeholders. The generated Node and script paths match your local installation. Restart the MCP client. Do not replace unrelated entries in an existing configuration.

Ask your agent: “List DeAlgo payments, request a 2,500-minor-unit refund for the selected payment using support-case-1042-refund as the request key, and show me the approval link.” Open that link as an administrator and review the exact amount. The agent can read the resulting status but cannot approve it.

## JavaScript integration

Install the same artifact into your application instead of globally:

```sh
npm install ./dealgo-middleware-0.1.0.tgz
```

```js
import { DeAlgo } from "@dealgo/middleware";

const dealgo = new DeAlgo({
  url: process.env.DEALGO_URL,
  apiKey: process.env.DEALGO_API_KEY,
});
const { data: payments } = await dealgo.listPayments();
const request = await dealgo.requestRefund({
  decisionId: payments[0].decisionId,
  amountMinor: 2500,
  reason: "requested_by_customer",
  requestKey: "support-case-1042-refund",
});
console.log(request.approvalUrl);
// Later, after operator review:
const outcome = await dealgo.getRefund(request.id);
```

Persist the request key with your support case. Reuse it after a connection failure; do not generate a new key for the same business request. Changed parameters with the same key return `idempotency_conflict`. A transport error never causes the client to submit automatically again. An unknown outcome means you should read the existing request and have an administrator check Stripe.

## HTTP contract

All agent requests use `Authorization: Bearer <restricted-key>`.

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/v1/refundable-payments` | Most recent recorded payments; eligibility checked on request |
| POST | `/api/v1/refund-requests` | Request exact amount; requires `Idempotency-Key` |
| GET | `/api/v1/refund-requests` | Latest 50 requests in the key's workspace |
| GET | `/api/v1/refund-requests/{id}` | Request status and recorded evidence |

The create body is `{ "decisionId": "...", "amountMinor": 2500, "reason": "requested_by_customer" }`. The response is HTTP 202 with a request ID, status, and relative approval path. `amountMinor` is an exact positive integer in the payment's currency; 2500 represents $25.00 for USD, but currency minor-unit conventions vary. Full-balance refunds are deliberately excluded from this request interface.

Only a same-origin administrator session can approve, reject, or reconcile. Requests expire after 24 hours awaiting review. Approval starts a five-minute dispatch window and permits one submission through the canonical release claim. The durable request binds payment, amount, currency, reason, and the parent authorization. Changed or revoked authority requires a fresh review, not implicit reapproval.

## Reading outcomes

`AWAITING_APPROVAL`, `REJECTED`, and `EXPIRED` are review states. `SUCCEEDED` requires a recorded provider status of `succeeded`; `PROVIDER_PENDING` and `OUTCOME_UNKNOWN` must not be presented as success. Administrators can use **Check Stripe outcome** to reconcile an uncertain claim or append a fresh provider observation without creating another refund. **Export evidence** downloads the current request, provider-response evidence, and latest observation. These exports are explicitly unsigned; they are not independent cryptographic proof.

## Pilot boundaries

- Stripe test credentials are mandatory. Production-built pilot servers additionally require the explicit server setting `DEALGO_ENABLE_TEST_REFUND_PILOT=true`. The default remains blocked, and this flag never permits live Stripe keys.
- The parent payment and authorization must already exist in DeAlgo. This package does not import arbitrary Stripe history or synthesize approval for a payment.
- Use restricted connection keys for agents. Keep Stripe credentials on the server and outside the agent's tools; DeAlgo cannot govern an independent route you also give the agent.
- This version is for a supervised, single-provider pilot. Hosted merchant onboarding, subscription billing, public package registry publication, and production operations are separate release work.
- Install the new server migration before exposing these endpoints. The client cannot supply missing server infrastructure.
