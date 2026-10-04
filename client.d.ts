export interface RefundRequest {
  id: string; decisionId: string; paymentIntentId: string; amountMinor: number; currency: string;
  reason: string | null; status: "AWAITING_APPROVAL" | "EXPIRED" | "REJECTED" | "SUCCEEDED" | "FAILED" | "PROVIDER_PENDING" | "REFUSED" | "OUTCOME_UNKNOWN";
  requestStatus: string; claimState: string | null; providerStatus: string | null; providerRefundId: string | null;
  expiresAt: string; createdAt: string; approvedAt: string | null; approvalPath: string; approvalUrl: string;
  evidence: { receiptId: string; recordedAt: string; outcome: unknown; trustClass: "PORTAL_RECORDED_PROVIDER_RESPONSE"; signed: false } | null;
}
export class DeAlgoError extends Error { code: string; status: number; outcomeUnknown: boolean; requestKey?: string }
export class DeAlgo {
  constructor(options: { url: string; apiKey: string; timeoutMs?: number; fetch?: typeof fetch });
  listPayments(): Promise<{ data: Array<{ decisionId: string; paymentIntentId: string; originalAmountMinor: number | null; currency: string | null }>; eligibility: "CHECKED_WHEN_REQUESTED"; limit: number }>;
  listRefunds(): Promise<{ data: Omit<RefundRequest, "approvalUrl">[]; limit: number }>;
  requestRefund(input: { decisionId: string; amountMinor: number; reason?: "duplicate" | "fraudulent" | "requested_by_customer" | null; requestKey: string }): Promise<RefundRequest>;
  getRefund(id: string): Promise<RefundRequest>;
}
