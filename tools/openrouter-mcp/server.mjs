#!/usr/bin/env node
// OpenRouter MCP server — auxiliary "second opinion" models for Claude Code.
// Claude Code itself stays on the user's Claude subscription; this server only
// forwards explicit tool calls to https://openrouter.ai.
//
// Secret handling: the API key is read from the OPENROUTER_API_KEY environment
// variable, falling back to OPENROUTER_API_KEY=... in the project's gitignored
// .env file. The key is never logged or returned in tool output.

import { readFileSync, existsSync, statSync } from 'node:fs';
import https from 'node:https';
import tls from 'node:tls';
import { execFileSync } from 'node:child_process';
import { dirname, resolve, relative, basename, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const HERE = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(HERE, '..', '..');
const API = 'https://openrouter.ai/api/v1';
const REQUEST_TIMEOUT_MS = Number(process.env.OPENROUTER_TIMEOUT_MS ?? 180_000);
const MAX_FILE_BYTES = 200_000;
const MODELS_CACHE_MS = 10 * 60 * 1000;
const ROUTING_PATH = resolve(HERE, 'model-routing.json');

// Task → model mapping, price cap and privacy policy. Re-read on every call so edits apply without a restart.
function loadRouting() {
  try {
    return JSON.parse(readFileSync(ROUTING_PATH, 'utf8'));
  } catch (err) {
    log('model-routing.json not loaded:', err.message);
    return { tasks: {} };
  }
}

// stdout is the MCP channel; diagnostics go to stderr only.
const log = (...args) => console.error('[openrouter-mcp]', ...args);

function getApiKey() {
  const fromEnv = process.env.OPENROUTER_API_KEY?.trim();
  if (fromEnv) return fromEnv;
  const envFile = resolve(PROJECT_ROOT, '.env');
  if (existsSync(envFile)) {
    const match = readFileSync(envFile, 'utf8').match(/^\s*OPENROUTER_API_KEY\s*=\s*["']?([^"'\r\n#]+)["']?/m);
    if (match?.[1]?.trim()) return match[1].trim();
  }
  return null;
}

function headers() {
  const key = getApiKey();
  if (!key) {
    throw new Error(
      'OPENROUTER_API_KEY is not set. Set it as an environment variable (then restart VS Code) ' +
        'or add OPENROUTER_API_KEY=... to the gitignored .env file in the project root.',
    );
  }
  return {
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': 'https://github.com/anthropics/claude-code',
    'X-Title': 'Claude Code OpenRouter MCP',
  };
}

// ---------- HTTPS with OS trust store fallback ----------
// Antivirus HTTPS scanning (e.g. Kaspersky) re-signs traffic with a root that Windows trusts but
// Node's bundled CA list does not. On the first certificate error we add the Windows root store
// to this process's trust list and retry once. Verification stays on; nothing system-wide changes.

const CERT_ERRORS = new Set([
  'SELF_SIGNED_CERT_IN_CHAIN',
  'UNABLE_TO_GET_ISSUER_CERT_LOCALLY',
  'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
  'DEPTH_ZERO_SELF_SIGNED_CERT',
  'CERT_UNTRUSTED',
]);
let httpsAgent = new https.Agent({ keepAlive: true });
let triedSystemCa = false;

function loadWindowsRootCas() {
  const script =
    "Get-ChildItem Cert:\\LocalMachine\\Root, Cert:\\CurrentUser\\Root | ForEach-Object { [Convert]::ToBase64String($_.RawData) } | Sort-Object -Unique";
  const out = execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], {
    encoding: 'utf8',
    timeout: 30_000,
    windowsHide: true,
  });
  return out
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((b64) => `-----BEGIN CERTIFICATE-----\n${b64.match(/.{1,64}/g).join('\n')}\n-----END CERTIFICATE-----\n`);
}

function rawRequest(url, { method = 'GET', headers = {}, body, timeoutMs = 30_000 }, agent) {
  return new Promise((resolveRequest, reject) => {
    const req = https.request(url, { method, headers, agent, signal: AbortSignal.timeout(timeoutMs) }, (res) => {
      let text = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => (text += chunk));
      res.on('end', () => {
        const status = res.statusCode ?? 0;
        resolveRequest({ status, ok: status >= 200 && status < 300, text });
      });
      res.on('error', reject);
    });
    req.on('error', (err) =>
      reject(err?.name === 'AbortError' ? new Error(`Request timed out after ${timeoutMs / 1000}s`) : err),
    );
    if (body) req.write(body);
    req.end();
  });
}

async function httpsRequest(url, opts = {}) {
  const usedAgent = httpsAgent;
  try {
    return await rawRequest(url, opts, usedAgent);
  } catch (err) {
    if (!CERT_ERRORS.has(err?.code) || process.platform !== 'win32') throw err;
    // Parallel requests may all fail at once; only the first reloads, the rest retry with its agent.
    if (usedAgent === httpsAgent) {
      if (triedSystemCa) throw err;
      triedSystemCa = true;
      try {
        const extra = loadWindowsRootCas();
        httpsAgent = new https.Agent({ keepAlive: true, ca: [...tls.rootCertificates, ...extra] });
        log(`TLS ${err.code}: now trusting ${extra.length} Windows root certificates for this process`);
      } catch (loadErr) {
        log('could not read the Windows certificate store:', loadErr.message);
        throw err;
      }
    }
    return rawRequest(url, opts, httpsAgent);
  }
}

// ---------- model discovery ----------

let modelsCache = { at: 0, data: [] };

async function fetchModels() {
  if (Date.now() - modelsCache.at < MODELS_CACHE_MS && modelsCache.data.length) return modelsCache.data;
  const res = await httpsRequest(`${API}/models`);
  if (!res.ok) throw new Error(`OpenRouter /models failed: HTTP ${res.status}`);
  const json = JSON.parse(res.text);
  modelsCache = { at: Date.now(), data: Array.isArray(json.data) ? json.data : [] };
  return modelsCache.data;
}

const perMillion = (v) => (v == null || v === '' ? null : Number(v) * 1_000_000);

function summariseModel(m) {
  const input = perMillion(m.pricing?.prompt);
  const output = perMillion(m.pricing?.completion);
  return {
    id: m.id,
    name: m.name,
    released: m.created ? new Date(m.created * 1000).toISOString().slice(0, 10) : null,
    context_length: m.context_length ?? null,
    usd_per_million_tokens: { input, output },
    free: input === 0 && output === 0,
    modalities: m.architecture?.input_modalities ?? undefined,
  };
}

// ---------- chat completion ----------

const withinCap = (m, cap) => {
  const { input, output } = m.usd_per_million_tokens;
  // Negative or missing prices mean "variable" (e.g. openrouter/auto), which could route to a costly model.
  return input != null && output != null && input >= 0 && output >= 0 && input <= cap.prompt && output <= cap.completion;
};

async function assertWithinCap(model, cap) {
  if (!cap) return;
  let catalogue;
  try {
    catalogue = await fetchModels();
  } catch {
    return; // catalogue unreachable: the request-level max_price below still applies
  }
  const found = catalogue.find((m) => m.id === model);
  if (!found) throw new Error(`Unknown model id "${model}". Use pick_model or list_models to choose a current id.`);
  const m = summariseModel(found);
  if (!withinCap(m, cap)) {
    const { input, output } = m.usd_per_million_tokens;
    throw new Error(
      `"${model}" costs $${input}/$${output} per million tokens (in/out), above the cap of $${cap.prompt}/$${cap.completion} ` +
        'in model-routing.json. Costly work belongs to Claude (Opus) on the subscription; do this task with Claude instead.',
    );
  }
}

async function chat({ model, messages, temperature, max_tokens, reasoning }) {
  const routing = loadRouting();
  const cap = routing.limits?.max_usd_per_million;
  await assertWithinCap(model, cap);

  const started = Date.now();
  const body = { model, messages, usage: { include: true } };
  if (temperature !== undefined) body.temperature = temperature;
  if (max_tokens !== undefined) body.max_tokens = max_tokens;
  if (reasoning) body.reasoning = reasoning === 'off' ? { enabled: false } : { effort: reasoning, exclude: true };
  const provider = {};
  if (cap) provider.max_price = { prompt: cap.prompt, completion: cap.completion };
  if (routing.privacy?.data_collection) provider.data_collection = routing.privacy.data_collection;
  if (Object.keys(provider).length) body.provider = provider;

  const send = () =>
    httpsRequest(`${API}/chat/completions`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(body),
      timeoutMs: REQUEST_TIMEOUT_MS,
    });
  let res = await send();
  // Some models (e.g. GLM, Kimi, Gemini Flash) refuse reasoning "off"; retry once at the lowest effort.
  if (res.status === 400 && body.reasoning?.enabled === false && /reasoning is mandatory/i.test(res.text)) {
    body.reasoning = { effort: 'low', exclude: true };
    res = await send();
  }

  const text = res.text;
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`OpenRouter returned non-JSON (HTTP ${res.status}): ${text.slice(0, 300)}`);
  }
  if (!res.ok || json.error) {
    const msg = json.error?.message ?? text.slice(0, 300);
    const hint =
      res.status === 401 ? ' (invalid API key)'
      : res.status === 402 ? ' (insufficient OpenRouter credits)'
      : res.status === 429 ? ' (rate limited — use the next candidate from pick_model)'
      : /data policy/i.test(msg) ? ' (this model\'s providers may train on prompts; use the next candidate from pick_model)'
      : /price/i.test(msg) ? ' (no provider within the price cap; use the next candidate or do it with Claude)'
      : /model/i.test(msg) ? ' (use pick_model or list_models to find a valid model id)'
      : '';
    throw new Error(`OpenRouter error for "${model}" HTTP ${res.status}: ${msg}${hint}`);
  }

  const choice = json.choices?.[0];
  return {
    model_requested: model,
    model_used: json.model ?? model,
    provider: json.provider ?? null,
    content: choice?.message?.content ?? '',
    finish_reason: choice?.finish_reason ?? null,
    usage: json.usage
      ? {
          prompt_tokens: json.usage.prompt_tokens,
          completion_tokens: json.usage.completion_tokens,
          reasoning_tokens: json.usage.completion_tokens_details?.reasoning_tokens ?? null,
          cost_usd: json.usage.cost ?? null,
        }
      : null,
    latency_ms: Date.now() - started,
  };
}

function formatResult(r) {
  const meta = [
    `model: ${r.model_used}`,
    r.provider && `provider: ${r.provider}`,
    r.usage &&
      `tokens: ${r.usage.prompt_tokens}→${r.usage.completion_tokens}` +
        (r.usage.reasoning_tokens ? ` (${r.usage.reasoning_tokens} reasoning)` : ''),
    r.usage?.cost_usd != null && `cost: $${Number(r.usage.cost_usd).toFixed(6)}`,
    `latency: ${(r.latency_ms / 1000).toFixed(1)}s`,
    r.finish_reason && r.finish_reason !== 'stop' && `finish_reason: ${r.finish_reason} (output may be truncated)`,
  ]
    .filter(Boolean)
    .join(' | ');
  const empty =
    r.finish_reason === 'length'
      ? '(empty: the max_tokens budget ran out, usually on hidden reasoning. Retry with reasoning "low"/"off" or a higher max_tokens.)'
      : '(empty response)';
  return `${r.content || empty}\n\n---\n${meta}`;
}

const ok = (text) => ({ content: [{ type: 'text', text }] });
const describeError = (err) => {
  const cause = err?.cause ? ` (${err.cause.code ?? ''} ${err.cause.message ?? ''})`.replace('( ', '(') : '';
  return `${err?.message ?? String(err)}${cause}`;
};
const fail = (err) => ({ content: [{ type: 'text', text: `Error: ${describeError(err)}` }], isError: true });

// ---------- safe file reading for review_code ----------

const SECRET_PATTERNS = [/^\.env(\..*)?$/i, /\.pem$/i, /\.key$/i, /^id_(rsa|ed25519|ecdsa)/i, /credentials/i, /secret/i, /\.npmrc$/i];

function readProjectFile(filePath) {
  const abs = isAbsolute(filePath) ? resolve(filePath) : resolve(PROJECT_ROOT, filePath);
  const rel = relative(PROJECT_ROOT, abs);
  if (rel.startsWith('..') || isAbsolute(rel)) throw new Error(`Refusing to read outside the project: ${filePath}`);
  if (SECRET_PATTERNS.some((p) => p.test(basename(abs)))) throw new Error(`Refusing to send a likely secret file: ${rel}`);
  if (!existsSync(abs) || !statSync(abs).isFile()) throw new Error(`File not found: ${rel}`);
  if (statSync(abs).size > MAX_FILE_BYTES) throw new Error(`File too large (> ${MAX_FILE_BYTES} bytes): ${rel}`);
  return { rel: rel.replaceAll('\\', '/'), text: readFileSync(abs, 'utf8') };
}

// Files are read here, not by Claude, so their contents never enter Claude's context.
const fileBlocks = (paths) => (paths ?? []).map(readProjectFile).map((f) => `## File: ${f.rel}\n\`\`\`\n${f.text}\n\`\`\``);
const filePathsSchema = z
  .array(z.string())
  .max(10)
  .optional()
  .describe('Project-relative files the server reads and sends directly (saves Claude tokens). Secrets refused; max 200 KB each.');

// ---------- server ----------

const server = new McpServer({ name: 'openrouter', version: '0.1.0' });

const modelIdSchema = z
  .string()
  .min(3)
  .describe('OpenRouter model id, e.g. from list_models ("vendor/model"). "openrouter/auto" lets OpenRouter choose.');

const reasoningSchema = z
  .enum(['off', 'low', 'medium', 'high'])
  .optional()
  .describe(
    'Reasoning effort for thinking models. Hidden reasoning is billed and uses the max_tokens budget. ' +
      'Use "off" or "low" for simple tasks; omit for the model default.',
  );

server.registerTool(
  'pick_model',
  {
    title: 'Pick OpenRouter models for a task',
    description:
      'Start here. Returns the recommended models for a task type from model-routing.json: free first, then ' +
      'medium-cost, each checked live for availability and the price cap, with suggested settings. Omit `task` ' +
      'to list task types and what stays with Claude. Free; no API key needed.',
    inputSchema: {
      task: z.string().optional().describe('Task type key, e.g. "code_review". Omit to list all task types.'),
    },
    annotations: { readOnlyHint: true, openWorldHint: true },
  },
  async ({ task }) => {
    try {
      const routing = loadRouting();
      const tasks = routing.tasks ?? {};
      if (!task || !tasks[task]) {
        const overview = {
          ...(task ? { error: `Unknown task "${task}".` } : {}),
          tasks: Object.fromEntries(Object.entries(tasks).map(([k, v]) => [k, v.use_for])),
          keep_on_claude: routing.keep_on_claude,
          price_cap_usd_per_million: routing.limits?.max_usd_per_million,
        };
        return ok(JSON.stringify(overview, null, 2));
      }
      const spec = tasks[task];
      const cap = routing.limits?.max_usd_per_million;
      const catalogue = new Map((await fetchModels()).map((m) => [m.id, summariseModel(m)]));
      const check = (tier) => (id) => {
        const m = catalogue.get(id);
        if (!m) return { id, tier, status: 'not in catalogue (retired?)' };
        const ok = !cap || withinCap(m, cap);
        return { id, tier, status: ok ? 'ok' : 'above price cap', usd_per_million_tokens: m.usd_per_million_tokens, context_length: m.context_length };
      };
      const candidates = [...(spec.free ?? []).map(check('free')), ...(spec.medium ?? []).map(check('medium'))];
      return ok(
        JSON.stringify(
          {
            task,
            use_for: spec.use_for,
            settings: spec.settings,
            candidates_in_order: candidates.filter((c) => c.status === 'ok'),
            unavailable: candidates.filter((c) => c.status !== 'ok'),
            notes: spec.notes,
            on_failure: 'Try the next candidate. If all fail or quality is poor, do the task with Claude.',
          },
          null,
          2,
        ),
      );
    } catch (err) {
      return fail(err);
    }
  },
);

server.registerTool(
  'list_models',
  {
    title: 'List OpenRouter models',
    description:
      'Discover current OpenRouter models (live catalogue, cached 10 min). Filter by a search string such as ' +
      '"qwen", "deepseek", "kimi", "gemini", "coder". Free; no API key needed. Use before choosing a model id.',
    inputSchema: {
      query: z.string().optional().describe('Case-insensitive substring matched against model id and name.'),
      sort: z.enum(['newest', 'cheapest', 'context']).default('newest'),
      free_only: z.boolean().default(false),
      within_cap_only: z.boolean().default(true).describe('Hide models above the price cap in model-routing.json.'),
      limit: z.number().int().min(1).max(100).default(20),
    },
    annotations: { readOnlyHint: true, openWorldHint: true },
  },
  async ({ query, sort, free_only, within_cap_only, limit }) => {
    try {
      const q = query?.toLowerCase().trim();
      const cap = loadRouting().limits?.max_usd_per_million;
      let models = (await fetchModels()).map(summariseModel);
      if (q) models = models.filter((m) => `${m.id} ${m.name}`.toLowerCase().includes(q));
      if (free_only) models = models.filter((m) => m.free);
      if (within_cap_only && cap) models = models.filter((m) => withinCap(m, cap));
      const price = (m) => (m.usd_per_million_tokens.input ?? Infinity) + (m.usd_per_million_tokens.output ?? Infinity);
      models.sort((a, b) =>
        sort === 'cheapest' ? price(a) - price(b)
        : sort === 'context' ? (b.context_length ?? 0) - (a.context_length ?? 0)
        : (b.released ?? '').localeCompare(a.released ?? ''),
      );
      const total = models.length;
      return ok(JSON.stringify({ total_matches: total, showing: Math.min(limit, total), models: models.slice(0, limit) }, null, 2));
    } catch (err) {
      return fail(err);
    }
  },
);

server.registerTool(
  'ask_model',
  {
    title: 'Ask an OpenRouter model',
    description:
      'Send one prompt to a single external model and return its answer with token usage and cost. ' +
      'Pass `file_paths` to have the server attach files directly (summarise, extract, draft) without loading them ' +
      'into Claude\'s context. The model cannot see the repo otherwise.',
    inputSchema: {
      model: modelIdSchema,
      prompt: z.string().min(1),
      file_paths: filePathsSchema,
      system: z.string().optional(),
      temperature: z.number().min(0).max(2).optional(),
      max_tokens: z.number().int().min(1).max(32_000).default(2_000),
      reasoning: reasoningSchema,
    },
    annotations: { openWorldHint: true },
  },
  async ({ model, prompt, file_paths, system, temperature, max_tokens, reasoning }) => {
    try {
      const user = [prompt, ...fileBlocks(file_paths)].join('\n\n');
      const messages = [...(system ? [{ role: 'system', content: system }] : []), { role: 'user', content: user }];
      return ok(formatResult(await chat({ model, messages, temperature, max_tokens, reasoning })));
    } catch (err) {
      return fail(err);
    }
  },
);

const REVIEW_SYSTEM =
  'You are a senior code reviewer. Report only real, specific problems: correctness bugs, security issues, ' +
  'edge cases, performance traps, and clear maintainability risks. For each finding give: severity ' +
  '(high/medium/low), location (line or symbol), the concrete failure scenario, and a suggested fix. ' +
  'Do not pad with praise or style nits. If you find nothing significant, say so plainly.';

server.registerTool(
  'review_code',
  {
    title: 'Code review by an OpenRouter model',
    description:
      'Get an independent code review from an external model. Pass `code` (a snippet or diff) and/or `file_paths` ' +
      '(project-relative; secrets like .env are refused, max 200 KB each). Treat findings as leads to verify, not verdicts.',
    inputSchema: {
      model: modelIdSchema,
      code: z.string().optional().describe('Code or unified diff to review.'),
      file_paths: filePathsSchema,
      focus: z.string().optional().describe('What to concentrate on, e.g. "race conditions", "a11y", "security".'),
      context: z.string().optional().describe('Background the reviewer needs: purpose, constraints, conventions.'),
      max_tokens: z.number().int().min(1).max(32_000).default(4_000),
      reasoning: reasoningSchema,
    },
    annotations: { openWorldHint: true },
  },
  async ({ model, code, file_paths, focus, context, max_tokens, reasoning }) => {
    try {
      const files = fileBlocks(file_paths);
      if (!code && files.length === 0) throw new Error('Provide `code` and/or `file_paths`.');
      const parts = [
        context && `## Context\n${context}`,
        focus && `## Review focus\n${focus}`,
        code && `## Code\n\`\`\`\n${code}\n\`\`\``,
        ...files,
      ].filter(Boolean);
      const messages = [
        { role: 'system', content: REVIEW_SYSTEM },
        { role: 'user', content: parts.join('\n\n') },
      ];
      return ok(formatResult(await chat({ model, messages, temperature: 0.2, max_tokens, reasoning })));
    } catch (err) {
      return fail(err);
    }
  },
);

server.registerTool(
  'compare_models',
  {
    title: 'Compare OpenRouter models',
    description:
      'Send the same prompt to 2–5 external models in parallel and return all answers side by side with cost and ' +
      'latency. Use when diverse perspectives matter (design trade-offs, ambiguous bugs). Claude synthesises the result.',
    inputSchema: {
      models: z.array(modelIdSchema).min(2).max(5),
      prompt: z.string().min(1),
      system: z.string().optional(),
      temperature: z.number().min(0).max(2).optional(),
      max_tokens: z.number().int().min(1).max(16_000).default(1_500),
      reasoning: reasoningSchema,
    },
    annotations: { openWorldHint: true },
  },
  async ({ models, prompt, system, temperature, max_tokens, reasoning }) => {
    try {
      headers(); // fail fast once if the key is missing
      const messages = [...(system ? [{ role: 'system', content: system }] : []), { role: 'user', content: prompt }];
      const results = await Promise.allSettled(
        models.map((model) => chat({ model, messages, temperature, max_tokens, reasoning })),
      );
      let totalCost = 0;
      const sections = results.map((r, i) => {
        if (r.status === 'rejected') return `## ${models[i]}\n\nFAILED: ${r.reason?.message ?? r.reason}`;
        totalCost += Number(r.value.usage?.cost_usd ?? 0);
        return `## ${models[i]}\n\n${formatResult(r.value)}`;
      });
      const okCount = results.filter((r) => r.status === 'fulfilled').length;
      return ok(`${sections.join('\n\n')}\n\n===\n${okCount}/${models.length} succeeded | total cost: $${totalCost.toFixed(6)}`);
    } catch (err) {
      return fail(err);
    }
  },
);

await server.connect(new StdioServerTransport());
log(`ready (key ${getApiKey() ? 'found' : 'MISSING'})`);
