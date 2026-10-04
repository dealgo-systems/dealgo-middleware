import test from 'node:test';
import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createRefundMcp } from '../mcp.mjs';
test('MCP handshake exposes request/status tools and no approval or raw provider tool', async () => {
  let proposed;
  const server = createRefundMcp({ listPayments: async () => ({data:[]}), requestRefund: async args => { proposed = args; return { status:'AWAITING_APPROVAL' }; }, getRefund: async () => ({status:'OUTCOME_UNKNOWN'}) });
  const client = new Client({name:'test',version:'1.0'});
  const [a,b] = InMemoryTransport.createLinkedPair();
  await server.connect(a); await client.connect(b);
  try {
    const tools = await client.listTools();
    assert.deepEqual(tools.tools.map(t=>t.name), ['dealgo_list_payments','dealgo_request_refund','dealgo_refund_status']);
    const reply = await client.callTool({name:'dealgo_request_refund',arguments:{decisionId:'d',amountMinor:2500,requestKey:'case-1234'}});
    assert.equal(JSON.parse(reply.content[0].text).status,'AWAITING_APPROVAL');
    assert.equal(proposed.amountMinor,2500);
    const invalid = await client.callTool({name:'dealgo_request_refund',arguments:{decisionId:'d',amountMinor:-1,requestKey:'case-1234'}});
    assert.equal(invalid.isError,true);
  } finally { await client.close(); await server.close(); }
});
