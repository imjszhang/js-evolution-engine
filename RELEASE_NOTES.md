# Release Notes

## v0.2.0

> **Publishing + host context ergonomics.** The npm tarball now bundles **`docs/`** plus **example sources** (`examples/minimal-demo` and `examples/cyber-taoist-demo` configs and runners; excluding local `data/` outputs). Hosts can inject verbatim markdown protocols via **`agentContextDocs`**; **`ActionTypeSpec`** supports an optional **`layer`** field for opaque host-side classification; **`examples/cyber-taoist-demo`** illustrates read-only constitution/skill injection. `package.json` gains **`repository`**, **`homepage`**, and **`bugs`**.

### Highlights

- **`agentContextDocs`** *(2026-05-09)*: optional array `{ id, source?, text }` from `oada.config.mjs` → `IntelligencePipeline` / `EvolutionEngine` → `PromptBuilder`; rendered at the top of analyze / decide templates via `{{AGENT_CONTEXT_DOCS}}`.
- **`ActionTypeSpec.layer`** *(2026-05-09)*: optional string; echoed in `{{ACTION_REGISTRY}}` as `[layer: …]`; not validated by the engine.
- **Published layout** *(2026-05-09)*: `npm install` ships **`docs/`** and **example sources** (`oada.config.mjs`, `run.mjs`, and cyber-taoist `README.md` / `human-guidance.md`). Runtime `examples/*/data/` dirs are recreated locally when you run a demo — they are not in the tarball.
- **Tests** *(2026-05-09)*: `tests/unit/prompt-builder.test.mjs` (+6); `DecisionQueue` passthrough assertion for arbitrary action keys.
- **Registry metadata** *(2026-05-09)*: `repository`, `homepage`, `bugs` on [`package.json`](package.json).

### Installation

```bash
npm install js-evolution-engine@0.2.0
```

### Downloads

- [npm package `js-evolution-engine`](https://www.npmjs.com/package/js-evolution-engine)
- Source: [`imjszhang/js-evolution-engine`](https://github.com/imjszhang/js-evolution-engine)

See [`CHANGELOG.md`](CHANGELOG.md) for the full list of changes.

---

## v0.1.0

> **Initial public library release.** OADA (**O**bserve → **A**nalyze → **D**ecide → **A**ct) autonomous evolution engine for AI agents: three independent pipelines (intelligence, execution, verification), host-agnostic `HostContext`, queue- or GitHub Issue–backed decisions, and an `oada` CLI. ESM-only, Node >= 18. Extracted from the embedded `src/evolution/autonomous/` module of `js-moltbook` into a standalone npm package.

### Highlights

- **`EvolutionEngine` + `observeAnalyzeAndDecide()`** *(2026-05-05)*: single-cycle orchestration for observe → analyze + decide (default one AI call).
- **Three pipelines** *(2026-05-05)*: `IntelligencePipeline` (intel → queue or GitHub Issues), `ExecutionPipeline` (claim → dispatch → host handlers), `VerifyPipeline` (GitHub PR audit / policy / auto-merge or local verifiers).
- **`HostContext`** *(2026-05-05)*: replaces the moltbook container; `NULL_HOST` / `normalizeHost` for defaults.
- **`BaseAIClient` + `MockAIClient`** *(2026-05-05)*: transport-agnostic AI surface; plug your provider via subclass.
- **`PromptBuilder` + `src/ai/prompts/*.md`** *(2026-05-05)*: overridable templates via `promptOverrides`.
- **Registries** *(2026-05-05)*: `ActionTypeRegistry` / `ActionTypeSpec`, `ObservationSourceRegistry` / `ObservationSourceSpec` with domain-agnostic builtins.
- **`DecisionQueue`** *(2026-05-05)*: file-backed pending decisions with `proper-lockfile` for safe concurrent claims.
- **`SelfModifier`** *(2026-05-05)*: safe file primitives (`writeFile`, `appendFile`, `modifyJson`, `rollbackLastChange`) with backups under `data/evolution/backups/`.
- **`GitHubIssueManager`** *(2026-05-05)*: parameterized owner/repo (`GITHUB_REPO_OWNER` / `GITHUB_REPO_NAME` or constructor args).
- **`oada` CLI** *(2026-05-05)*: `intel`, `exec`, `verify`, `decisions`; loads `oada.config.mjs`.
- **`examples/minimal-demo`** *(2026-05-05)*: intel → exec demo without external AI services.
- **Quality** *(2026-05-05)*: Vitest unit tests for `DecisionQueue`, `ActionTypeRegistry`, `ObservationSourceRegistry`, `QueryResolver` (19 tests); see [`CHANGELOG.md`](CHANGELOG.md).
- **Docs** *(2026-05-05)*: [`README.md`](README.md), [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md), [`docs/HOST_ADAPTER.md`](docs/HOST_ADAPTER.md), [`docs/MIGRATION_FROM_MOLTBOOK.md`](docs/MIGRATION_FROM_MOLTBOOK.md).

### Runtime

- **Dependencies**: `js-yaml`, `proper-lockfile` (see [`package.json`](package.json)).

### Migration Notes

- **First npm-tracked release** for `js-evolution-engine`. If you previously vendored the evolution module inside an app, switch to `npm install js-evolution-engine` and provide `oada.config.mjs`; see [`docs/MIGRATION_FROM_MOLTBOOK.md`](docs/MIGRATION_FROM_MOLTBOOK.md).
- **Limitations vs the original embedded module** (full list in [`CHANGELOG.md`](CHANGELOG.md)): English prompts by default (`promptOverrides` for custom phrasing); moltbook-specific `DecisionExecutionVerifier` not ported (use `host.actionVerifiers`); OpenClaw Gateway not bundled (bring your own `BaseAIClient` subclass); rich Feishu-style notifications removed (use `host.notifier`).

### Downloads

- [npm package `js-evolution-engine`](https://www.npmjs.com/package/js-evolution-engine)

### Installation Instructions

#### As a dependency

1. `npm install js-evolution-engine@0.2.0` — or `@latest` after publish; pin `@0.1.0` only if you need the first tarball layout (no bundled `docs/` / `examples/`).
2. `import { EvolutionEngine, /* … */ } from 'js-evolution-engine'` — see public API in [`README.md`](README.md).
3. Add `oada.config.mjs` at the project root and run `npx oada intel` / `exec` / `verify` as needed.

#### Local / monorepo (`file:`)

1. In the consumer `package.json`:
   `"js-evolution-engine": "file:../js-evolution-engine"` (adjust the relative path).
2. `npm install` in the consumer root.

#### Verify the tarball contents

1. From the package root: `npm pack --dry-run`
2. Run the library tests: `npm test`
3. Optional: `npm run demo` — runs [`examples/minimal-demo/run.mjs`](examples/minimal-demo/run.mjs)
