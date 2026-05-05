# Architecture

`js-evolution-engine` implements an OADA loop with a strict separation between three pipelines.

## Pipelines

```
                     ┌────────── HostContext ──────────┐
                     │  logger / notifier / handlers / │
                     │  intelligenceStore / analytics  │
                     └─────────────────────────────────┘
                                       │
       ┌───────────────────────────────┼───────────────────────────────┐
       │                               │                               │
       ▼                               ▼                               ▼
┌─────────────────┐            ┌─────────────────┐            ┌─────────────────┐
│ Intelligence    │            │ Execution       │            │ Verify          │
│                 │            │                 │            │                 │
│ • Observe (AI)  │  decisions │ • Claim         │   PRs /    │ • Audit PRs     │
│ • Analyze (AI)  │  ──────►   │ • Dispatch      │  outcomes  │ • Apply policy  │
│ • Decide  (AI)  │  via queue │ • Modify        │  ────────► │ • (Auto-)merge  │
│                 │  or Issues │   (handlers)    │            │ • Report        │
└─────────────────┘            └─────────────────┘            └─────────────────┘
```

Each pipeline:
- Is a separate exported class.
- Can be invoked from the CLI (`oada intel|exec|verify`) or programmatically.
- Persists its inputs/outputs to `data/evolution/` for traceability.
- Is *idempotent at the action level*: re-running `exec` simply skips already-completed decisions.

## Decoupling: the DecisionQueue

The intel pipeline produces decisions; the exec pipeline consumes them. They communicate via the `DecisionQueue` (file-locked JSON in `data/evolution/pending_decisions.json`) — *not* by direct method call. This means:

- Intel and exec can run on different schedules / different machines.
- Concurrent exec workers can `claimNext(N)` safely (proper-lockfile).
- The queue acts as an audit log of every action ever proposed.

When `mode: 'github'` is used, GitHub Issues replace the queue and add a human-in-the-loop checkpoint.

## File layout (host project)

```
<project-root>/
├── oada.config.mjs                # host adapter (this is the only required file)
├── data/
│   ├── goals/active_goals.json    # optional goal tree (consumed by GoalProvider)
│   ├── evolution/
│   │   ├── pending_decisions.json # DecisionQueue persistence
│   │   ├── feature_requests/      # FeatureRequestQueue (one JSON per request)
│   │   ├── records/<cycle-id>/    # EvolutionLogger (per-phase JSON + meta)
│   │   ├── draft_issues/<cycle>/  # local mode intel output (briefing.md + issues.json)
│   │   ├── verify_reports/        # verify pipeline reports
│   │   ├── backups/               # SelfModifier file backups
│   │   ├── human_guidance.md      # operator advice (read at cycle start)
│   │   └── OADA.md                # operating rules injected into AI prompts
│   └── execution_logs/*.jsonl     # SelfAnalyzer's input
└── (your code…)
```

## Phase details

### Observe
`AIDrivenObserver` builds a minimal bootstrap context (project intro from README, goal text, project tree from `scanProjectStructure`, current time, last-cycle recap, OADA rules) and asks the AI to autonomously explore and produce a Markdown observation report. The AI decides what to read.

### Analyze + Decide (combined)
The default `EvolutionEngine.observeAnalyzeAndDecide()` runs analyze and decide as a single AI call (cheaper, less latency, no inter-phase serialization loss). The prompt template lives in `src/ai/prompts/analyze-decide.md` and is fully overridable via `PromptBuilder({ overrides })`.

You can still run them separately by using `PromptBuilder.buildAnalysisPrompt()` then `buildDecisionPrompt()`.

### Act
`ActionExecutor` dispatches each decided action to `host.actionHandlers[action.type]`. Handlers receive a `ctx` object with `{ projectRoot, cycleId, modifier, ai, featureQueue, host, client, logger, goalsText }`.

The `SelfModifier` provides safe primitives — `writeFile / appendFile / modifyJson` — that automatically backup the previous version under `data/evolution/backups/`.

### Verify
- **GitHub mode**: scans open PRs whose head ref is `oada/issue-*`, fetches CI check runs, applies risk policies (from `data/config/verify_policies.yaml`), and either reports or auto-merges.
- **Local mode**: `verifyActions(executedResults, projectRoot, host)` calls `host.actionVerifiers[type].verify(action, result, ctx)` and falls back to a generic "files-exist" check based on `created_files` / `modified_files` returned by handlers.

## Time

The engine uses Beijing time (UTC+8) for cycle ids and timestamps. Override with the `OADA_TZ` environment variable. The vendored helpers (`isoBeijing`, `nowBeijingStr`, etc.) are exported for convenience.

## Logging

The `EvolutionLogger` writes per-phase JSON under `data/evolution/records/<cycle-id>/`, including the full prompts and AI responses (large payloads are spilled to side files automatically). This is invaluable for debugging prompt regressions.
