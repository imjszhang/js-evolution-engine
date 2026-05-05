/**
 * Minimal OADA host config — used by both `oada <subcommand>` CLI and `run.mjs`.
 *
 * Wires:
 *   - a MockAIClient that returns a canned analyze+decide response
 *   - one custom action handler `create_note` (writes a markdown note)
 *   - basic console logger
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { MockAIClient, ActionTypeRegistry, ActionTypeSpec } from '../../src/index.mjs';

const cannedAnalyzeDecide = {
  analysis: {
    key_patterns: [
      'demo project has no historical data yet',
      'evolution loop is being bootstrapped for the first time',
    ],
    root_causes: {
      high_performers_why: 'n/a (cold start)',
      low_performers_why: 'n/a (cold start)',
      failures_why: 'n/a (cold start)',
    },
    opportunities: [
      { opportunity: 'Document the bootstrap state', potential_impact: 'low', effort: 'low' },
    ],
    goal_assessment: {
      bootstrap: {
        status: 'just started',
        trend: 'stable',
        observed_signals: ['demo run initiated'],
        gap: 'need a record of the first successful cycle',
      },
    },
  },
  decision: 'execute',
  rationale: 'Mock AI suggests writing a kickoff note to demonstrate the full loop.',
  actions: [
    {
      type: 'create_note',
      description: 'Write a kickoff note documenting the first OADA cycle',
      serves_goal: 'bootstrap',
      goal_rationale: 'first cycle should leave a paper trail',
      priority: 'low',
      params: { filename: 'kickoff.md', body: '# OADA Kickoff\n\nThe loop ran successfully.\n' },
      expected_impact: 'one note file under data/notes/',
      risk: 'none',
    },
  ],
  goal_coverage: { covered: ['bootstrap'], not_covered: {} },
  deferred: [],
  risk_mitigation: [],
  goal_suggestions: [],
  confidence_score: 0.5,
};

const consoleLogger = {
  info: (msg) => console.log(`[info] ${msg}`),
  warning: (msg) => console.warn(`[warn] ${msg}`),
  error: (msg) => console.error(`[err ] ${msg}`),
};

/** Custom action types for this demo. */
const actionRegistry = new ActionTypeRegistry();
actionRegistry.register(new ActionTypeSpec({
  name: 'create_note',
  description: 'Create a markdown note',
  promptHint: 'Write a markdown note (params: filename, body)',
  defaultRisk: 'low',
}));

/** Action handlers — keyed by action.type. */
const actionHandlers = {
  create_note: (action, ctx) => {
    const filename = action.params?.filename || 'note.md';
    const body = action.params?.body || '# Untitled\n';
    const dir = join(ctx.projectRoot, 'data', 'notes');
    mkdirSync(dir, { recursive: true });
    const fullPath = join(dir, filename);
    writeFileSync(fullPath, body, 'utf-8');
    ctx.logger?.info(`note written: ${fullPath}`);
    return { success: true, created_files: [join('data', 'notes', filename)], message: 'note created' };
  },
};

export default async function ({ cwd }) {
  const aiClient = new MockAIClient({
    canned: [
      // Match the analyze+decide prompt by its template signature
      { match: /Analysis & Decision/i, response: cannedAnalyzeDecide },
      // Observe prompt — return a plausible markdown observation
      {
        match: /observation report/i,
        response:
          '# Observation Report\n\n## State\nThe project is freshly bootstrapped.' +
          '\n\n## Files\nMinimal demo files only.\n\n## Signals\nNo prior cycles.\n\n' +
          '## Recommended Focus\nWrite a kickoff note to confirm end-to-end flow.\n',
      },
    ],
    defaultResponse: cannedAnalyzeDecide,
  });

  return {
    aiClient,
    actionRegistry,
    host: {
      basePath: cwd,
      appName: 'oada-demo',
      logger: consoleLogger,
      actionHandlers,
    },
  };
}
