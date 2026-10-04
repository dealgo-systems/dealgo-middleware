import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
export function createRefundMcp(client) {
  const server = new McpServer({ name: "dealgo-refunds", version: "0.1.0" });
  const call = async fn => {
    try { return { content: [{ type: "text", text: JSON.stringify(await fn()) }] }; }
    catch (error) { return { isError: true, content: [{ type: "text", text: JSON.stringify({ error: error.code ?? "request_failed", outcomeUnknown: error.outcomeUnknown ?? false, requestKey: error.requestKey }) }] }; }
  };
  server.registerTool("dealgo_list_payments", { description: "List the workspace's recent payments already recorded in DeAlgo. Eligibility is checked when a refund is requested. This is not a list of every payment in Stripe.", inputSchema: {}, annotations: { readOnlyHint: true } }, () => call(() => client.listPayments()));
  server.registerTool("dealgo_request_refund", {
    description: "Request an exact refund for administrator review. Does not execute or approve a refund. Keep the SAME requestKey for retries of the same business request. Show the returned approvalUrl to the operator. Never claim success unless the status is SUCCEEDED.",
    inputSchema: { decisionId: z.string().min(1).max(100), amountMinor: z.number().int().positive().max(2147483647), reason: z.enum(["duplicate", "fraudulent", "requested_by_customer"]).optional(), requestKey: z.string().regex(/^[a-zA-Z0-9_-]{8,128}$/) },
    annotations: { destructiveHint: false, idempotentHint: true },
  }, input => call(() => client.requestRefund(input)));
  server.registerTool("dealgo_refund_status", { description: "Read a refund request and its recorded provider evidence. OUTCOME_UNKNOWN and PROVIDER_PENDING do not mean the refund succeeded. This read does not resubmit or retry the refund.", inputSchema: { requestId: z.string().min(1).max(100) }, annotations: { readOnlyHint: true } }, ({ requestId }) => call(() => client.getRefund(requestId)));
  return server;
}
export async function startMcp(client) { await createRefundMcp(client).connect(new StdioServerTransport()); }
