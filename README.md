# js-evolution-engine

> OADA (**O**bserve → **A**nalyze → **D**ecide → **A**ct → Verify) autonomous evolution engine for AI agents. A pluggable, host-agnostic framework with a three-pipeline architecture: Issue-driven decisions, queue-based execution, and risk-aware verification.

[![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](#)
[![ESM](https://img.shields.io/badge/module-ESM-blue)](#)
[![License](https://img.shields.io/badge/license-MIT-lightgrey)](LICENSE)

## What it is

`js-evolution-engine` orchestrates an *autonomous self-evolution loop* for AI-driven projects. It separates **what to do** (the intelligence pipeline) from **how to do it** (the execution pipeline) and **whether the result is safe to keep** (the verify pipeline). Each pipeline can be invoked independently from the CLI, run on a schedule, or composed programmatically.

```
┌──────────────────────┐    ┌──────────────────────┐    ┌──────────────────────┐
│  Intelligence        │    │  Execution           │    │  Verify              │
│  Observe → Analyze   │ →  │  Claim → Dispatch    │ →  │  Audit → Policy      │
│        → Decide      │    │       → Modify       │    │       → (Auto-)Merge │
│  Output: Issues +    │    │  Source: Queue or    │    │  Source: GitHub PRs  │
│         Queue        │    │           GitHub     │    │       or local       │
└──────────────────────┘    └──────────────────────┘    └──────────────────────┘
        ↑                            ↑                            ↑
        └────── HostContext ─────────┴────── AI Client ───────────┘
                  (logger, notifier, action handlers,
                   intelligence store, analytics, …)
```

## 5-minute quickstart

```bash
npm install js-evolution-engine
```

Create `oada.config.mjs` in your project root:

```javascript
import { MockAIClient, ActionTypeRegistry, ActionTypeSpec } from 'js-evolution-engine';

const actionRegistry = new ActionTypeRegistry();
actionRegistry.register(new ActionTypeSpec({
  name: 'send_email',
  description: 'Send a notification email',
  promptHint: 'Send an email (params: to, subject, body)',
  defaultRisk: 'low',
}));

export default async function ({ cwd }) {
  return {
    aiClient: new MockAIClient({ /* or your own AI subclass */ }),
    actionRegistry,
    host: {
      basePath: cwd,
      appName: 'my-agent',
      logger: console,
      actionHandlers: {
        send_email: async (action, ctx) => {
          // your real send-email logic here
          ctx.logger?.info(`would email ${action.params?.to}`);
          return { success: true, message: 'sent' };
        },
      },
    },
  };
}
```

Then:

```bash
npx oada intel              # observe + analyze + decide → queue actions
npx oada exec  --limit 5    # consume the queue
npx oada decisions          # inspect queue state
npx oada verify --auto      # (github mode) audit PRs + auto-merge low-risk
```

See [`examples/minimal-demo`](examples/minimal-demo) for a runnable example with no external dependencies.

## Documentation

- [Architecture](docs/ARCHITECTURE.md) — pipelines, dataflow, file layout
- [Host adapter guide](docs/HOST_ADAPTER.md) — the `HostContext` contract
- [Migration from js-moltbook](docs/MIGRATION_FROM_MOLTBOOK.md) — for projects switching from the original embedded module
- [Changelog](CHANGELOG.md)

## Public API

```javascript
import {
  // Engine + pipelines
  EvolutionEngine, IntelligencePipeline, ExecutionPipeline, VerifyPipeline,
  // Host abstractions
  NULL_HOST, normalizeHost,
  // AI
  BaseAIClient, MockAIClient, AIError,
  PromptBuilder, promptBuilder,
  // Registries
  ACTION_REGISTRY, ActionTypeRegistry, ActionTypeSpec,
  OBSERVATION_REGISTRY, ObservationSourceRegistry, ObservationSourceSpec,
  // Queues
  DecisionQueue, FeatureRequestQueue,
  // Adapters
  HumanGuidanceReader, EvolutionLogger,
  // Helpers
  scanProjectStructure, QueryResolver, GoalProvider,
  // GitHub integration
  GitHubIssueManager, OADA_LABEL_DEFS,
  // Time helpers (vendored)
  isoBeijing, todayBeijing, nowBeijing, nowBeijingStr,
} from 'js-evolution-engine';
```

## Status

`v0.1.0` — extracted from the original embedded `src/evolution/autonomous/` module of a production agent. Core flows are covered by unit tests; CLI and minimal-demo run end-to-end. Some advanced features (e.g. detailed PR auto-merge policies, sub-agent dispatch via OpenClaw Gateway) are still simplified compared to the original; see `CHANGELOG.md`.

## License

MIT — see [LICENSE](LICENSE).
