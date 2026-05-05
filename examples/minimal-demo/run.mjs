#!/usr/bin/env node
/**
 * minimal-demo/run.mjs — drive a full intel → exec cycle without going
 * through the CLI. Useful for testing the engine programmatically.
 *
 * Run:
 *   cd examples/minimal-demo && node run.mjs
 *
 * Expected outcome:
 *   - data/notes/kickoff.md is created
 *   - data/evolution/draft_issues/<cycle-id>/ has briefing.md + issues.json
 *   - data/evolution/pending_decisions.json reflects 1 completed decision
 */
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { IntelligencePipeline, ExecutionPipeline } from '../../src/index.mjs';
import loadConfig from './oada.config.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  // Run from this demo directory so relative paths resolve correctly
  process.chdir(__dirname);
  const cfg = await loadConfig({ cwd: __dirname });

  console.log('\n=== Phase 1: intel pipeline ===');
  const intel = new IntelligencePipeline({
    aiClient: cfg.aiClient,
    host: cfg.host,
    projectRoot: __dirname,
    goalId: 'bootstrap',
    mode: 'local',
  });
  const intelResult = await intel.run();
  console.log('  success:', intelResult.success);
  console.log('  actions queued:', intelResult.decisions_queued.length);
  if (!intelResult.success) {
    console.error('  error:', intelResult.error);
    process.exit(1);
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
  if (!execResult.success) {
    console.error('  error:', execResult.error);
    process.exit(1);
  }

  console.log('\n=== Done ===');
  console.log('Outputs:');
  console.log(`  - ${__dirname}/data/notes/kickoff.md`);
  console.log(`  - ${__dirname}/data/evolution/draft_issues/<cycle-id>/`);
  console.log(`  - ${__dirname}/data/evolution/pending_decisions.json`);
}

main().catch((e) => {
  console.error('demo failed:', e);
  process.exit(1);
});
