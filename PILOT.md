# DeAlgo refund pilot

DeAlgo helps teams let an agent request a refund while an administrator controls the exact payment, amount, currency, and reason. Start with one support workflow and Stripe test mode. The agent integrates through MCP, JavaScript, or HTTP; it never receives a Stripe key or an approval tool.

## Who this pilot fits

Support automation teams and software vendors evaluating agent refunds with human approval. You need a configured DeAlgo pilot workspace, a workspace administrator, and a governed test payment already recorded there. Server provisioning is assisted; this release is not a self-service hosted signup or an importer for arbitrary Stripe payments.

## Evaluate one complete workflow

1. Have the pilot operator provision the workspace and record an authorized Stripe test payment.
2. Create a restricted agent connection in the review queue. Install the [release package](https://github.com/dealgo-systems/dealgo-middleware/releases/tag/v0.1.0) and run the connection check in the [installation guide](README.md).
3. Replace the agent's refund action with `requestRefund`, or connect the three MCP tools. Persist the request key with the support case.
4. Open the returned link as an administrator, review the exact request, and approve or reject it.
5. Read the resulting status. Export the recorded evidence and check the provider outcome when necessary.

Keep other direct refund tools and provider credentials outside this agent's reach. A middleware connection cannot enforce approval on a separate bypass you also give the agent.

## Acceptance criteria

| Scenario | Expected result |
|---|---|
| Normal approved request | Exact approved amount reaches Stripe test mode; resulting provider status is visible |
| Repeated support-case request | Same request identity; no new proposal |
| Changed amount with the same key | Conflict requiring explicit review of a new request |
| Agent attempts approval | Refused |
| Another workspace reads the request | Refused |
| Concurrent administrator approvals | One submission through the governed claim |
| Timeout or uncertain provider outcome | Unknown remains visible; no blind resubmission |
| Pending provider outcome | Pending remains visible until an observation resolves it |
| Parent authority changes or is revoked | Refused before dispatch |

Record integration time, approval turnaround, refusal reasons, unresolved outcomes, and time needed to reconstruct a disputed action. Compare these with your existing workflow. We do not yet publish customer savings or reliability benchmarks.

## Request a pilot discussion

Open a [pilot request](https://github.com/dealgo-systems/dealgo-middleware/issues/new?template=pilot.yml) with your intended workflow and integration method. GitHub issues are public: use fictional examples and share no credentials, customer records, transaction IDs, or private commercial information. A request is an expression of interest, not a service commitment.

## Current limits

This prerelease supports supervised Stripe test refunds only. It does not support live money, merchant OAuth onboarding, subscription billing, or a production SLA. Evidence exports are explicitly unsigned. It requires existing DeAlgo payment and authorization records. Independent cryptographic verification and a separately operated production service are not supplied by the client package.
