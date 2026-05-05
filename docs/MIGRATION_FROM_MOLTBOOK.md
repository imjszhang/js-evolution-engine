# Migration from `js-moltbook`'s embedded `src/evolution/autonomous/`

This document is for projects that previously embedded the OADA framework directly under `src/evolution/autonomous/` (the original home of this code). It explains how to switch to `js-evolution-engine` as an external dependency.

> The current extraction does **not** modify the `js-moltbook` repository. It is safe to keep the embedded module running while you migrate piece-by-piece.

## Stage 0 — install the package

```bash
npm install js-evolution-engine
```

## Stage 1 — provide a host adapter

Create `oada.config.mjs` at the moltbook project root:

```javascript
import { ACTION_REGISTRY, ActionTypeSpec } from 'js-evolution-engine';
// existing moltbook modules
import { Container } from './src/application/container.mjs';
import { ConfigManager } from './src/core/config.mjs';
import { OpenClawAIClient } from './src/api/openclaw-client.mjs'; // your local subclass

// Re-register moltbook-specific action types
ACTION_REGISTRY.register(new ActionTypeSpec({
  name: 'generate_content',
  description: 'Content generation',
  promptHint: 'Generate posts (params: topic, style, count)',
  defaultRisk: 'low',
}));
ACTION_REGISTRY.register(new ActionTypeSpec({
  name: 'optimize_commenting',
  description: 'Commenting strategy optimization',
  promptHint: 'Optimize replies (params: scenario, tone)',
  defaultRisk: 'low',
}));
ACTION_REGISTRY.register(new ActionTypeSpec({
  name: 'update_posting_plan',
  description: 'Update posting plan',
  promptHint: 'Update posting plan (params: ...)',
  defaultRisk: 'medium',
}));

// Custom verifier for posting plan
const postingPlanVerifier = {
  verify(action, _result, { projectRoot }) {
    const plan = JSON.parse(readFileSync(join(projectRoot, 'content', 'posting_plan.json'), 'utf-8'));
    const unposted = (plan.posts || []).filter(p => !p.posted).length;
    return {
      action,
      metric: 'unposted_count',
      value: unposted,
      status: unposted > 5 ? 'improved' : 'neutral',
    };
  },
};

export default async function ({ cwd }) {
  const config = new ConfigManager().load();
  const container = new Container({ config });

  return {
    aiClient: new OpenClawAIClient({ thinking: 'low' }),
    host: {
      basePath: cwd,
      appName: 'JS-Moltbook',
      logger: container.logger,
      notifier: container.notifier,
      client: container.client,
      analyticsReader: container.analyticsReader,
      intelligenceStore: container.intelligenceStore,
      knowledgeWriter: container.knowledgeWriter,
      actionVerifiers: {
        update_posting_plan: postingPlanVerifier,
      },
      actionHandlers: {
        // Move the bodies of moltbook's action handlers in here
        generate_content: async (action, ctx) => { /* ... */ },
        optimize_commenting: async (action, ctx) => { /* ... */ },
        update_posting_plan: async (action, ctx) => { /* ... */ },
      },
    },
  };
}
```

## Stage 2 — switch the moltbook plugin entry points

`openclaw-plugin/index.mjs` currently dynamically imports modules from `./src/evolution/autonomous/...`. Update those imports:

| Old import                                             | New import                                     |
| ------------------------------------------------------ | ---------------------------------------------- |
| `./src/evolution/autonomous/intel-pipeline.mjs`        | `js-evolution-engine` → `IntelligencePipeline` |
| `./src/evolution/autonomous/exec-pipeline.mjs`         | `js-evolution-engine` → `ExecutionPipeline`    |
| `./src/evolution/autonomous/verify-pipeline.mjs`       | `js-evolution-engine` → `VerifyPipeline`       |
| `./src/evolution/autonomous/decision-queue.mjs`        | `js-evolution-engine` → `DecisionQueue`        |
| `./src/evolution/autonomous/feature-request.mjs`       | `js-evolution-engine` → `FeatureRequestQueue`  |
| `./src/evolution/autonomous/github-issues.mjs`         | `js-evolution-engine` → `GitHubIssueManager`   |
| `./src/evolution/autonomous/action-registry.mjs`       | `js-evolution-engine` → `ACTION_REGISTRY`      |
| `./src/evolution/autonomous/observation-registry.mjs`  | `js-evolution-engine` → `OBSERVATION_REGISTRY` |

Each pipeline now takes a `{ host, aiClient, ... }` constructor argument instead of a moltbook `Container`. Construct them from the values exposed by your `oada.config.mjs` factory.

## Stage 3 — migrate domain modules

The following moltbook-specific files in `src/evolution/autonomous/` were intentionally **not** ported (they are domain logic, not framework):
- `verifier.mjs` — `DecisionExecutionVerifier` (posting-plan auditor)
- The moltbook-specific built-in action types and observation sources
- The moltbook-specific prompt phrasing (now generic English, override via `PromptBuilder({ overrides })` if you want the Chinese phrasing back)

Move these into `src/usecases/` or wherever they fit best in your moltbook codebase.

## Stage 4 — delete the embedded module

Once everything is wired through `js-evolution-engine` and tests pass, delete `src/evolution/autonomous/` from `js-moltbook` and remove its references from `openclaw-plugin/index.mjs`.

## What changed semantically

- **AI client is host-provided.** The original code constructed `OpenClawAIClient` directly with a moltbook session-key convention; the new engine takes any `BaseAIClient` subclass.
- **`Container` is gone.** Replaced by the lighter `HostContext` interface — no class, just an object literal with optional fields.
- **Prompts are generic by default.** The moltbook-flavored Chinese prompt text was moved out of the engine. Restore via `promptOverrides` if needed.
- **Action handlers live in the host.** The original `actions.mjs` had a hard-coded `posting_plan.json` verifier; that responsibility moved to `host.actionVerifiers`.
- **GitHub repo is configurable.** Hard-coded `imjszhang/js-moltbook` is now `GITHUB_REPO_OWNER` / `GITHUB_REPO_NAME` env vars or constructor args.

## Compatibility table

| Old class/function                         | Engine equivalent                       | Notes                          |
| ------------------------------------------ | --------------------------------------- | ------------------------------ |
| `AutoEvolutionEngine`                      | `EvolutionEngine`                       | Old name aliased for compat    |
| `OpenClawAIClient`                         | `BaseAIClient` + your subclass          | Moved to host                  |
| `PromptBuilder.buildXxx()` (static)        | `promptBuilder.buildXxx()` (instance)   | Or pass `actionRegistry`       |
| `verifyContent()` in `actions.mjs`         | `host.actionVerifiers[type].verify()`   | Hard-coded path removed        |
| `Container.notifier.sendMessage(c, '🧬 JS-Moltbook ...')` | `host.notifier.sendMessage(c, host.appName)` | Title parameterized |
