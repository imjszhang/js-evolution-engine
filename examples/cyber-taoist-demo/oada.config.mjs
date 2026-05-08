/**
 * Cyber-Taoist host config — demonstrates how a host project can layer an
 * external protocol on top of js-evolution-engine without forking the engine.
 *
 * Wires:
 *   - agentContextDocs from the cyber-taoist repo (CONSTITUTION.md, SKILL.md)
 *     read verbatim — this example never modifies them.
 *   - human-guidance.md (in this directory) for the *project-local* clauses
 *     that should NOT live in the universal constitution.
 *   - a small ActionTypeRegistry that demonstrates the optional `layer` field.
 *   - a MockAIClient with a canned response that includes layer / hypothesis /
 *     success_signal / failure_signal / death_boundary, so the demo can verify
 *     custom fields flow through to action handlers untouched.
 *
 * This demo intentionally does NOT implement self_modify, evolution-state
 * tracking, probe harvesting, or core-tier human approval. Those concerns
 * belong to real host projects (e.g. js-moltbook), not to the engine itself.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  MockAIClient,
  ActionTypeRegistry,
  ActionTypeSpec,
} from '../../src/index.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Resolve the cyber-taoist docs directory. */
function resolveDocsDir() {
  if (process.env.CYBER_TAOIST_DOCS_DIR) {
    return resolve(process.env.CYBER_TAOIST_DOCS_DIR);
  }
  // Default assumes a sibling checkout: <parent>/cyber-taoist/docs
  return resolve(__dirname, '../../../cyber-taoist/docs');
}

function readDoc(docsDir, filename) {
  const full = resolve(docsDir, filename);
  if (!existsSync(full)) {
    throw new Error(
      `cyber-taoist doc not found: ${full}\n` +
      `Either clone https://github.com/<org>/cyber-taoist alongside this repo, ` +
      `or set CYBER_TAOIST_DOCS_DIR=/path/to/cyber-taoist/docs`,
    );
  }
  return readFileSync(full, 'utf-8');
}

const consoleLogger = {
  info: (msg) => console.log(`[info] ${msg}`),
  warning: (msg) => console.warn(`[warn] ${msg}`),
  error: (msg) => console.error(`[err ] ${msg}`),
};

/**
 * Demo action types showing the optional `layer` field. The engine treats
 * `layer` as opaque metadata; it is the host's job to decide what (if any)
 * routing to apply based on it.
 */
const actionRegistry = new ActionTypeRegistry();
actionRegistry.register(new ActionTypeSpec({
  name: 'maintain_core_channel',
  description: 'Routine maintenance of a core revenue / trust channel',
  promptHint: 'Keep a core channel healthy (params: channel, action_detail)',
  defaultRisk: 'low',
  layer: 'core',
  autoExecutable: false,
}));
actionRegistry.register(new ActionTypeSpec({
  name: 'pause_low_priority',
  description: 'Pause a non-core activity to conserve resources',
  promptHint: 'Pause a low-priority activity (params: target, duration_hours)',
  defaultRisk: 'low',
  layer: 'buffer',
}));
actionRegistry.register(new ActionTypeSpec({
  name: 'probe_new_format',
  description: 'Run a small experiment with a new content format',
  promptHint: 'Run a probe (params: hypothesis, success_signal, failure_signal, death_boundary)',
  defaultRisk: 'low',
  layer: 'probe',
}));

/**
 * Action handlers — keyed by action.type. Each one just logs the action it
 * received, so we can verify that custom fields like `hypothesis`, `layer`,
 * `success_signal`, etc. survive the trip through the decision queue.
 */
const actionHandlers = {
  maintain_core_channel: (action, ctx) => {
    ctx.logger?.info(
      `[core] maintain ${action.params?.channel ?? '?'}: ${action.params?.action_detail ?? ''}`,
    );
    return { success: true, message: 'core maintenance noted' };
  },
  pause_low_priority: (action, ctx) => {
    ctx.logger?.info(
      `[buffer] pause ${action.params?.target ?? '?'} for ${action.params?.duration_hours ?? '?'}h`,
    );
    return { success: true, message: 'paused' };
  },
  probe_new_format: (action, ctx) => {
    ctx.logger?.info(
      `[probe] hypothesis="${action.hypothesis ?? '?'}" ` +
      `success="${action.success_signal ?? '?'}" ` +
      `failure="${action.failure_signal ?? '?'}" ` +
      `death_boundary="${action.death_boundary ?? '?'}"`,
    );
    return { success: true, message: 'probe launched (logged only)' };
  },
};

const cannedAnalyzeDecide = {
  analysis: {
    key_patterns: [
      'Demo run — no real consequences observed yet',
      'This canned response is meant to exercise field passthrough only',
    ],
    root_causes: {
      high_performers_why: 'n/a (demo)',
      low_performers_why: 'n/a (demo)',
      failures_why: 'n/a (demo)',
    },
    opportunities: [
      { opportunity: 'Verify constitution + skill are visible in prompt', potential_impact: 'low', effort: 'low' },
    ],
    goal_assessment: {
      bootstrap: {
        status: 'just started',
        trend: 'stable',
        observed_signals: ['demo run initiated'],
        gap: 'first cycle without real data',
      },
    },
  },
  decision: 'execute',
  rationale: 'Demonstrate that core / buffer / probe layered actions and probe metadata flow end-to-end.',
  actions: [
    {
      type: 'maintain_core_channel',
      description: 'Log a core-channel heartbeat',
      serves_goal: 'bootstrap',
      goal_rationale: 'core layer must keep breathing',
      priority: 'low',
      layer: 'core',
      params: { channel: 'demo-account', action_detail: 'heartbeat ping' },
      expected_impact: 'core stays alive',
      risk: 'none',
    },
    {
      type: 'pause_low_priority',
      description: 'Trim buffer to free capacity for probes',
      serves_goal: 'bootstrap',
      goal_rationale: 'buffer absorbs cost so core/probe can move',
      priority: 'low',
      layer: 'buffer',
      params: { target: 'low-priority-task', duration_hours: 24 },
      expected_impact: 'small capacity gain',
      risk: 'low',
    },
    {
      type: 'probe_new_format',
      description: 'Launch one bounded probe',
      serves_goal: 'bootstrap',
      goal_rationale: 'probe surfaces fresh information from current 天道',
      priority: 'medium',
      layer: 'probe',
      hypothesis: 'short on-camera threads outperform pure-text threads in current platform regime',
      success_signal: 'engagement rate up 20% on probe vs baseline within 48h',
      failure_signal: 'engagement flat or down 24h after publish, no organic re-share',
      death_boundary: 'one low-traffic publishing slot; does not affect core account weighting',
      params: { format: 'short-on-camera-thread', sample_size: 1 },
      expected_impact: 'one decisive signal regardless of outcome',
      risk: 'low',
    },
  ],
  goal_coverage: { covered: ['bootstrap'], not_covered: {} },
  deferred: [],
  risk_mitigation: [
    'Probe is sized to die without touching the core channel.',
  ],
  goal_suggestions: [],
  confidence_score: 0.4,
};

export default async function ({ cwd }) {
  const docsDir = resolveDocsDir();

  // The two cyber-taoist documents are read verbatim. The demo never writes
  // to docsDir; this is a one-way dependency.
  const agentContextDocs = [
    {
      id: 'cyber-taoist:constitution',
      source: 'CONSTITUTION.md',
      text: readDoc(docsDir, 'CONSTITUTION.md'),
    },
    {
      id: 'cyber-taoist:skill',
      source: 'SKILL.md',
      text: readDoc(docsDir, 'SKILL.md'),
    },
  ];

  const aiClient = new MockAIClient({
    canned: [
      { match: /Strategic Analysis & Decision/i, response: cannedAnalyzeDecide },
      {
        match: /observation report/i,
        response:
          '# Observation Report\n\n## State\nDemo run with cyber-taoist context loaded.' +
          '\n\n## Files\nMinimal demo files only.\n\n## Signals\nNo prior cycles.\n\n' +
          '## Recommended Focus\nVerify that constitution + skill are present in the analyze prompt and that probe metadata flows through.\n',
      },
    ],
    defaultResponse: cannedAnalyzeDecide,
  });

  return {
    aiClient,
    actionRegistry,
    agentContextDocs,
    host: {
      basePath: cwd,
      appName: 'cyber-taoist-demo',
      logger: consoleLogger,
      actionHandlers,
    },
  };
}
