// End-to-end smoke test: spawns server.mjs over stdio exactly as Claude Code does,
// lists tools, discovers a model live, and (if a key is available) asks it a question.
// Usage: node tools/openrouter-mcp/smoke-test.mjs [model-id]

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { fileURLToPath } from 'node:url';

const serverPath = fileURLToPath(new URL('./server.mjs', import.meta.url));
const client = new Client({ name: 'smoke-test', version: '0.0.0' });
// Pass the full environment: the SDK's default whitelist drops OPENROUTER_API_KEY and NODE_EXTRA_CA_CERTS.
await client.connect(
  new StdioClientTransport({ command: process.execPath, args: [serverPath], env: { ...process.env }, stderr: 'inherit' }),
);

const text = (r) => r.content.map((c) => c.text).join('\n');

const { tools } = await client.listTools();
console.log('tools:', tools.map((t) => t.name).join(', '));

const listed = await client.callTool({ name: 'list_models', arguments: { query: 'qwen', limit: 3 } });
console.log('\nlist_models(qwen):\n', text(listed));
if (listed.isError && !process.argv[2]) {
  console.error('\nlist_models failed and no model id was given; stopping.');
  await client.close();
  process.exit(1);
}

const model = process.argv[2] ?? JSON.parse(text(listed)).models[0]?.id;
const asked = await client.callTool({
  name: 'ask_model',
  arguments: { model, prompt: 'Reply with exactly: MCP round-trip OK', max_tokens: 50, temperature: 0 },
});
console.log(`\nask_model(${model}) ${asked.isError ? 'ERROR' : 'OK'}:\n`, text(asked));

await client.close();
process.exit(asked.isError ? 1 : 0);
