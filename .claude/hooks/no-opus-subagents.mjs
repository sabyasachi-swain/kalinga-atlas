#!/usr/bin/env node
// PreToolUse hook (Agent|Task): Opus is reserved for the main session.
// Denies any subagent launch that would run on Opus, with a reason Claude can act on
// (retry with model "sonnet" or "haiku"). Anything it cannot parse is allowed through.

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const deny = (reason) => {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: reason },
    }),
  );
  process.exit(0);
};

let input;
try {
  input = JSON.parse(readFileSync(0, 'utf8'));
} catch {
  process.exit(0);
}
const toolInput = input?.tool_input ?? {};
const type = toolInput.subagent_type ?? 'general-purpose';
const isOpus = (m) => typeof m === 'string' && /opus/i.test(m);
const HINT = 'Opus is only for the main session in this project. Retry with model: "sonnet" (or "haiku" for tool-driven work), and hand drafting to OpenRouter via pick_model.';

// 1. Explicit model on the call.
if (isOpus(toolInput.model)) deny(`Subagent "${type}" requested ${toolInput.model}. ${HINT}`);
if (toolInput.model) process.exit(0); // explicit non-Opus model wins over the agent file

// 2. Forks always inherit the main session's model (Opus).
if (type === 'fork') deny(`A fork inherits the main session's Opus model. Use a named agent with model: "sonnet" instead. ${HINT}`);

// 3. Agent file model (project, then user).
const projectDir = process.env.CLAUDE_PROJECT_DIR ?? input.cwd ?? process.cwd();
const agentFile = [join(projectDir, '.claude', 'agents', `${type}.md`), join(homedir(), '.claude', 'agents', `${type}.md`)].find(existsSync);
if (agentFile) {
  const fm = readFileSync(agentFile, 'utf8').match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? '';
  const model = fm.match(/^model:\s*["']?([^"'\r\n]+)/m)?.[1]?.trim();
  if (isOpus(model)) deny(`Agent "${type}" defaults to ${model} in its agent file. ${HINT}`);
  if (model && model !== 'inherit') process.exit(0);
}

// 4. Built-in agents, or agent files with no model / inherit: they run on the main session's Opus
//    unless CLAUDE_CODE_SUBAGENT_MODEL is set. Explore ignores that variable and always inherits.
const configured = process.env.CLAUDE_CODE_SUBAGENT_MODEL;
if (configured && !isOpus(configured) && type !== 'Explore') process.exit(0);
deny(`Agent "${type}" has no model of its own and would inherit the main session's Opus. ${HINT}`);
