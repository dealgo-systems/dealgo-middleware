export class DeAlgoError extends Error {
  constructor(code, { status = 0, outcomeUnknown = false, requestKey } = {}) {
    super(code); this.name = "DeAlgoError"; this.code = code; this.status = status;
    this.outcomeUnknown = outcomeUnknown; this.requestKey = requestKey;
  }
}
export class DeAlgo {
  #url; #key; #fetch; #timeout;
  constructor({ url, apiKey, timeoutMs = 15000, fetch: fetchImpl = globalThis.fetch }) {
    const parsed = new URL(url);
    const local = ["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname);
    if (parsed.username || parsed.password || parsed.search || parsed.hash || parsed.pathname !== "/" || (parsed.protocol !== "https:" && !(local && parsed.protocol === "http:"))) throw new DeAlgoError("https_origin_required");
    if (typeof apiKey !== "string" || !apiKey.startsWith("dealgo_sk_") || /\s/.test(apiKey)) throw new DeAlgoError("api_key_required");
    if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 120000) throw new DeAlgoError("invalid_timeout");
    this.#url = parsed.origin; this.#key = apiKey; this.#fetch = fetchImpl; this.#timeout = timeoutMs;
  }
  async #request(path, body, requestKey) {
    let response;
    try {
      response = await this.#fetch(`${this.#url}${path}`, { method: body ? "POST" : "GET", redirect: "error", signal: AbortSignal.timeout(this.#timeout), headers: { Authorization: `Bearer ${this.#key}`, Accept: "application/json", ...(body ? { "Content-Type": "application/json", "Idempotency-Key": requestKey } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
    } catch { throw new DeAlgoError("transport_uncertain", { outcomeUnknown: Boolean(body), requestKey }); }
    let result;
    try { result = await response.json(); } catch { throw new DeAlgoError("invalid_response", { status: response.status, outcomeUnknown: Boolean(body), requestKey }); }
    if (!response.ok) throw new DeAlgoError(typeof result?.error?.code === "string" ? result.error.code : "request_failed", { status: response.status, outcomeUnknown: Boolean(body) && response.status >= 500, requestKey });
    if (!result || typeof result !== "object") throw new DeAlgoError("invalid_response", { outcomeUnknown: Boolean(body), requestKey });
    return result;
  }
  listPayments() { return this.#request("/api/v1/refundable-payments"); }
  listRefunds() { return this.#request("/api/v1/refund-requests"); }
  async requestRefund({ decisionId, amountMinor, reason = null, requestKey }) {
    if (typeof decisionId !== "string" || !/^[a-zA-Z0-9_-]{1,100}$/.test(decisionId) || !Number.isSafeInteger(amountMinor) || amountMinor <= 0 || amountMinor > 2147483647 || !/^[a-zA-Z0-9_-]{8,128}$/.test(requestKey ?? "")) throw new DeAlgoError("invalid_refund_request");
    if (reason !== null && !["duplicate", "fraudulent", "requested_by_customer"].includes(reason)) throw new DeAlgoError("invalid_reason");
    const result = await this.#request("/api/v1/refund-requests", { decisionId, amountMinor, reason }, requestKey);
    return this.#withApprovalUrl(result);
  }
  async getRefund(id) {
    if (typeof id !== "string" || !/^[a-zA-Z0-9-]{1,100}$/.test(id)) throw new DeAlgoError("invalid_request_id");
    return this.#withApprovalUrl(await this.#request(`/api/v1/refund-requests/${encodeURIComponent(id)}`));
  }
  #withApprovalUrl(result) {
    if (typeof result.id !== "string" || typeof result.status !== "string" || typeof result.approvalPath !== "string" || !result.approvalPath.startsWith("/v3/refund-requests?request=")) throw new DeAlgoError("invalid_response");
    const approvalUrl = new URL(result.approvalPath, this.#url);
    if (approvalUrl.origin !== this.#url) throw new DeAlgoError("invalid_approval_origin");
    return { ...result, approvalUrl: approvalUrl.href };
  }
}
