#!/usr/bin/env node
import { DeAlgo } from "./client.mjs";
import { fileURLToPath } from "node:url";
const command = process.argv[2];
if (!command || command === "--help") {
  console.log("DeAlgo middleware pilot\nCommands: doctor | doctor-commerce | config | mcp | mcp-commerce\nSet DEALGO_URL and DEALGO_API_KEY. doctor performs one read-only authenticated check.");
} else if (command === "config") {
  console.log(JSON.stringify({ mcpServers: { dealgo: { command: process.execPath, args: [fileURLToPath(import.meta.url), "mcp"], env: { DEALGO_URL: "https://YOUR-PILOT-PORTAL", DEALGO_API_KEY: "YOUR-RESTRICTED-CONNECTION-KEY" } } } }, null, 2));
} else {
  try {
    const client = new DeAlgo({ url: process.env.DEALGO_URL, apiKey: process.env.DEALGO_API_KEY });
    if (command === "doctor") {
      const result = await client.listPayments();
      console.log(JSON.stringify({ connected: true, recordedPayments: result.data.length, next: result.data.length ? "Request a refund, then open its approval URL as an administrator." : "Record a governed test payment in DeAlgo before requesting a refund.", mode: "test-pilot" }, null, 2));
    } else if (command === "doctor-commerce") {
      const result=await client.listMandates(); console.log(JSON.stringify({connected:true,mandates:result.mandates.length,executionEnabled:false,reviewUrl:new URL("/commerce/control",process.env.DEALGO_URL).href},null,2));
    } else if (command === "mcp-commerce") {
      const { startCommerceMcp }=await import("./mcp.mjs");await startCommerceMcp(client);
    } else if (command === "mcp") {
      const { startMcp } = await import("./mcp.mjs"); await startMcp(client);
    } else { throw new Error("unknown_command"); }
  } catch (error) { console.error(JSON.stringify({ error: error.code ?? "configuration_or_connection_failed" })); process.exitCode = 1; }
}
