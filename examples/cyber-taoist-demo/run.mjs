#!/usr/bin/env node
/**
 * cyber-taoist-demo/run.mjs — drive a full intel → exec cycle and verify that:
 *   1. agentContextDocs (cyber-taoist CONSTITUTION + SKILL) reach the AI prompt
 *      verbatim; and
 *   2. custom action fields (layer, hypothesis, success_signal, ...) survive
 *      the trip through the decision queue intact and reach actionHandlers.
 *
 * Run:
 *   cd examples/cyber-taoist-demo && node run.mjs
 *
 * Or with a non-default cyber-taoist location:
 *   CYBER_TAOIST_DOCS_DIR=/path/to/cyber-taoist/docs node run.mjs
 *
 * This demo writes only to its own data/ directory. It never touches the
 * cyber-taoist repository.
 */
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync, existsSync } from 'node:fs';
import { IntelligencePipeline, ExecutionPipeline } from '../../src/index.mjs';
import loadConfig from './oada.config.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  process.chdir(__dirname);
  const cfg = await loadConfig({ cwd: __dirname });

  console.log('\n=== agentContextDocs loaded ===');
  for (const d of cfg.agentContextDocs || []) {
    const head = d.text.split('\n').slice(0, 2).join(' | ');
    console.log(`  - ${d.id} (source: ${d.source})  preview: ${head.slice(0, 80)}...`);
  }

  console.log('\n=== Phase 1: intel pipeline ===');
  const intel = new IntelligencePipeline({
    aiClient: cfg.aiClient,
    host: cfg.host,
    projectRoot: __dirname,
    goalId: 'bootstrap',
    mode: 'local',
    agentContextDocs: cfg.agentContextDocs,
  });
  const intelResult = await intel.run();
  console.log('  success:', intelResult.success);
  console.log('  actions queued:', intelResult.decisions_queued.length);
  if (!intelResult.success) {
    console.error('  error:', intelResult.error);
    process.exit(1);
  }

  // Inspect the queue file directly to confirm custom fields survived.
  const queueFile = join(__dirname, 'data', 'evolution', 'pending_decisions.json');
  if (existsSync(queueFile)) {
    const raw = JSON.parse(readFileSync(queueFile, 'utf-8'));
    console.log('\n=== custom fields preserved in decision queue ===');
    for (const d of raw.decisions) {
      const a = d.action || {};
      const tags = [];
      if (a.layer) tags.push(`layer=${a.layer}`);
      if (a.hypothesis) tags.push('hypothesis');
      if (a.success_signal) tags.push('success_signal');
      if (a.failure_signal) tags.push('failure_signal');
      if (a.death_boundary) tags.push('death_boundary');
      console.log(`  - ${a.type}: ${tags.join(', ') || '(no custom fields)'}`);
    }
  }

  console.log('\n=== Phase 2: exec pipeline ===');
  const exec = new ExecutionPipeline({
    host: cfg.host,
    projectRoot: __dirname,
    aiClient: cfg.aiClient,
    source: 'queue',
  });
  const execResult = await exec.run({ limit: 5 });
  console.log('  success:', execResult.success);
  console.log('  executed:', execResult.executed.length);
  for (const e of execResult.executed) {
    console.log(`    - ${e.action?.type}: ${e.result?.success ? 'OK' : 'FAIL'} ${e.result?.message || e.result?.error || ''}`);
  }

  console.log('\n=== Done ===');
  console.log('Outputs:');
  console.log(`  - ${__dirname}/data/evolution/pending_decisions.json`);
  console.log(`  - ${__dirname}/data/evolution/draft_issues/<cycle-id>/`);
  console.log('\nNote: the engine and this demo never wrote to the cyber-taoist repo.');
  console.log('      Real usage (state files, self_modify, core-tier approval) belongs in the host project.');
}

main().catch((e) => {
  console.error('demo failed:', e);
  process.exit(1);
});
