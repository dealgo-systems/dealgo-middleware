import test from 'node:test';
import assert from 'node:assert/strict';
import {DeAlgo} from '../client.mjs';
import {createCommerceMcp} from '../mcp.mjs';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {InMemoryTransport} from '@modelcontextprotocol/sdk/inMemory.js';
test('commerce client preserves exact terms and ambiguity without retries',async()=>{
 const calls=[];const input={mandateId:'mandate-one',action:'purchase',counterpartyId:'vendor_one',amountMinor:2500,currency:'usd',description:'Office supplies',requestKey:'purchase-one'};
 const client=new DeAlgo({url:'https://example.invalid',apiKey:'dealgo_sk_test_fixture',fetch:async(...args)=>{calls.push(args);return Response.json({proposal:{id:'one',status:'APPROVED'},executionEnabled:false});}});
 const result=await client.propose(input);assert.equal(result.executionEnabled,false);assert.equal(result.approvalUrl,'https://example.invalid/commerce/control');assert.equal(calls[0][1].headers['Idempotency-Key'],input.requestKey);assert.equal(JSON.parse(calls[0][1].body).amountMinor,2500);
 await assert.rejects(client.propose({...input,amountMinor:0}));assert.equal(calls.length,1);
 let attempts=0;const uncertain=new DeAlgo({url:'https://example.invalid',apiKey:'dealgo_sk_test_fixture',fetch:async()=>{attempts++;throw Error('lost');}});
 await assert.rejects(uncertain.propose(input),e=>e.outcomeUnknown&&e.requestKey===input.requestKey);assert.equal(attempts,1);
});
test('commerce MCP exposes no approval, execution, merchant, or billing tool',async()=>{
 const server=createCommerceMcp({listMandates:async()=>({mandates:[]}),propose:async()=>({proposal:{status:'PENDING'},executionEnabled:false}),getProposal:async()=>({proposal:{status:'APPROVED'},executionEnabled:false})});
 const client=new Client({name:'test',version:'1'});const [a,b]=InMemoryTransport.createLinkedPair();await server.connect(a);await client.connect(b);
 try{assert.deepEqual((await client.listTools()).tools.map(x=>x.name),['dealgo_list_mandates','dealgo_propose_deal','dealgo_proposal_status']);const r=await client.callTool({name:'dealgo_proposal_status',arguments:{proposalId:'one'}});assert.equal(JSON.parse(r.content[0].text).executionEnabled,false);}finally{await client.close();await server.close();}
});
