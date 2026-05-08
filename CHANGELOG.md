# Changelog

All notable changes to `js-evolution-engine` are documented here.

This project follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and (loosely) [Semantic Versioning](https://semver.org/).

## [0.2.0] — 2026-05-09

### Added

- **`agentContextDocs`** — hosts can inject arbitrary markdown (e.g. external constitutions or skills) verbatim at the top of analyze / decide / analyze-decide prompts. Wired through `oada.config.mjs`, `IntelligencePipeline`, and `EvolutionEngine`; see [`docs/HOST_ADAPTER.md`](docs/HOST_ADAPTER.md#injecting-agent-context-documents).
- **`PromptBuilder`** — accepts optional `agentContextDocs` on `buildAnalysisDecisionPrompt`, `buildAnalysisPrompt`, and `buildDecisionPrompt`; new `{{AGENT_CONTEXT_DOCS}}` placeholder in default prompt templates.
- **`ActionTypeSpec.layer`** — optional free-form metadata string, rendered in the action registry prompt section as `[layer: …]` when set (engine does not interpret values).
- **`examples/cyber-taoist-demo`** — reference host wiring `agentContextDocs` from an external docs directory (`CYBER_TAOIST_DOCS_DIR`), layered actions, and custom action field passthrough; read-only toward upstream markdown.
- **`tests/unit/prompt-builder.test.mjs`** and extra `DecisionQueue` coverage for passthrough fields.

### Changed

- **npm package contents** — installs include **`docs/`** (architecture, host adapter, migration) alongside **`src/`**. Example **sources** ship as explicit paths under `examples/minimal-demo/` and `examples/cyber-taoist-demo/` (configs and `run.mjs`; cyber-taoist also includes its `README.md` and `human-guidance.md`). Local-only `examples/*/data/` artefacts are **not** published — they appear after you run a demo from the installed paths.
- **`package.json`** — `repository`, `homepage`, and `bugs` fields for registry discoverability.

## [0.1.0] — 2026-05-05

### Added

- Initial extraction of the OADA framework from `js-moltbook`'s embedded `src/evolution/autonomous/` module into a standalone, host-agnostic npm package.
- `EvolutionEngine` orchestrator with a single `observeAnalyzeAndDecide()` cycle.
- Three pipelines, each independently invocable:
  - `IntelligencePipeline` (Observe → Analyze + Decide → publish to queue or GitHub Issues)
  - `ExecutionPipeline` (consume queue / GitHub Issues, dispatch to host action handlers)
  - `VerifyPipeline` (audit OADA PRs, apply risk-based merge policies)
- `HostContext` interface (replacing the moltbook `Container`) with `NULL_HOST` default.
- `BaseAIClient` + `MockAIClient` (transport-agnostic AI client; subclass to plug in your provider).
- `PromptBuilder` with templates extracted to `src/ai/prompts/*.md` and full override support via `promptOverrides`.
- Generic, domain-agnostic builtins for `ActionTypeRegistry` (implement_feature, fix_reliability, refactor_code, update_config, generate_content) and `ObservationSourceRegistry` (execution_logs, evolution_history, feature_requests, human_guidance).
- `DecisionQueue` with file-locking via `proper-lockfile` for safe concurrent claims.
- `SelfModifier` reduced to generic safe-write primitives (`writeFile / appendFile / modifyJson / rollbackLastChange`); domain-specific modifications belong in host action handlers.
- `GitHubIssueManager` parameterized for any owner/repo (env vars `GITHUB_REPO_OWNER` / `GITHUB_REPO_NAME` or constructor args).
- `oada` CLI with subcommands: `intel`, `exec`, `verify`, `decisions`. Loads host adapter from `oada.config.mjs`.
- `examples/minimal-demo` — full intel→exec cycle with no external dependencies.
- Vitest unit tests for `DecisionQueue`, `ActionTypeRegistry`, `ObservationSourceRegistry`, `QueryResolver` (19 tests, all green).
- Documentation: `README.md`, `docs/ARCHITECTURE.md`, `docs/HOST_ADAPTER.md`, `docs/MIGRATION_FROM_MOLTBOOK.md`.

### Notes / Limitations vs the original embedded module

- The Chinese prompt phrasing was replaced with generic English. Hosts that want the original phrasing can pass `promptOverrides`.
- The moltbook-specific `DecisionExecutionVerifier` (posting-plan auditor) was intentionally not ported — it's domain logic, not framework. Use `host.actionVerifiers` to register equivalents.
- The OpenClaw Gateway transport was not vendored. Hosts that use it should keep their own `OpenClawAIClient` subclass extending `BaseAIClient`.
- The detailed feishu / business notifications (`🧬 JS-Moltbook ...` titles, etc.) were stripped. Provide your own `host.notifier` to restore.
- The combined Analyze+Decide is the default and recommended; the separate Analyze and Decide prompts are preserved for hosts that need the two-call flow.
