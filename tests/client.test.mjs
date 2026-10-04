import test from 'node:test';
import assert from 'node:assert/strict';
import { DeAlgo } from '../client.mjs';
const options = { url: 'https://example.invalid', apiKey: 'dealgo_sk_test_fixture' };
const refund = { id: 'request-123', status: 'AWAITING_APPROVAL', approvalPath: '/v3/refund-requests?request=request-123' };
test('client sends exact request with caller-persisted retry identity and forbids redirects', async () => {
  const calls = [];
  const client = new DeAlgo({ ...options, fetch: async (...args) => { calls.push(args); return Response.json(refund); } });
  const input = { decisionId: 'd1', amountMinor: 2500, requestKey: 'case-1234' };
  const result = await client.requestRefund(input); await client.requestRefund(input);
  assert.equal(result.approvalUrl, 'https://example.invalid/v3/refund-requests?request=request-123');
  for (const [,init] of calls) { assert.equal(init.redirect, 'error'); assert.equal(init.headers['Idempotency-Key'], 'case-1234'); assert.deepEqual(JSON.parse(init.body), { decisionId:'d1', amountMinor:2500, reason:null }); }
});
test('transport ambiguity never causes automatic resubmission', async () => {
  let calls = 0;
  const client = new DeAlgo({ ...options, fetch: async () => { calls++; throw Error('socket closed'); } });
  await assert.rejects(client.requestRefund({ decisionId:'d1', amountMinor:1, requestKey:'case-1234' }), error => error.outcomeUnknown && error.requestKey === 'case-1234');
  assert.equal(calls, 1);
});
test('client refuses insecure remote origins, credentials in URLs and path injection', async () => {
  for (const url of ['http://remote.invalid','https://user:pass@example.invalid','https://example.invalid/api','https://example.invalid?key=x']) assert.throws(() => new DeAlgo({ ...options, url }));
  new DeAlgo({ ...options, url:'http://localhost:3106' });
  const client = new DeAlgo({ ...options, fetch: async () => { throw Error('must not call'); } });
  await assert.rejects(client.getRefund('../keys'));
});
test('server conflict propagates without retry or interpretation as approval', async () => {
  const client = new DeAlgo({ ...options, fetch: async () => Response.json({ error:{ code:'idempotency_conflict' } }, { status:409 }) });
  await assert.rejects(client.requestRefund({ decisionId:'d1', amountMinor:1, requestKey:'case-1234' }), error => error.code === 'idempotency_conflict' && error.outcomeUnknown === false);
});
