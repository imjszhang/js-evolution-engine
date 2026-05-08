# cyber-taoist-demo

A reference host configuration showing how to layer a protocol documented in
markdown (`CONSTITUTION.md` + `SKILL.md`) on top of `js-evolution-engine` using
`agentContextDocs` — without forking the engine.

This demo intentionally stays narrow:

- **Bundles** verbatim copies under [`cyber-taoist-demo/cyber-taoist-docs/`](cyber-taoist-docs/) so you can browse and run locally with **no sibling repo**. See [`cyber-taoist-docs/README.md`](cyber-taoist-docs/README.md).
- Optionally **overrides** the docs directory with **`CYBER_TAOIST_DOCS_DIR`** (e.g. point at a live cyber-taoist checkout); never modifies the files being read.
- **Injects** them verbatim into the analyze/decide prompt via `agentContextDocs`.
- **Registers** three demo action types (`maintain_core_channel`,
  `pause_low_priority`, `probe_new_format`) using the optional `layer`
  metadata field (`core` / `buffer` / `probe`). The engine treats `layer`
  as opaque — any routing on top of it is the host's job.
- **Verifies** that custom action fields (`layer`, `hypothesis`,
  `success_signal`, `failure_signal`, `death_boundary`) survive the
  decision queue and reach `actionHandlers` intact.

## What is *not* in this demo (and shouldn't be)

These belong to a real host project (e.g. `js-moltbook`), not to the engine
and not to a generic example:

- Persistent evolution-state tracking (current "phase", probe lifecycle).
- Active-probe harvesting / death-feedback structuring.
- A working `self_modify` action handler.
- Core-tier human approval policy.
- A real AI client (this demo uses `MockAIClient` with canned responses).

## Prerequisites

**Default:** none — `CONSTITUTION.md` and `SKILL.md` are in
`examples/cyber-taoist-demo/cyber-taoist-docs/`.

**Optional:** set **`CYBER_TAOIST_DOCS_DIR`** to an absolute path containing
those two files (e.g. your own clone’s `docs/`).

## Run

```bash
# from the repo root (uses bundled cyber-taoist-docs)
node examples/cyber-taoist-demo/run.mjs

# or point at another docs directory:
CYBER_TAOIST_DOCS_DIR=/abs/path/to/cyber-taoist/docs \
  node examples/cyber-taoist-demo/run.mjs
```

Expected output highlights:

- A list of injected documents (id + source + first-line preview).
- A summary of the decision queue showing each action's preserved custom
  fields (`layer=core` / `hypothesis` / `success_signal` / ...).
- An exec-phase log line per action proving the handler received those
  fields.

## Files

| File | Purpose |
|------|---------|
| `cyber-taoist-docs/CONSTITUTION.md` | Bundled constitution (upstream snapshot). |
| `cyber-taoist-docs/SKILL.md` | Bundled application guide (upstream snapshot). |
| `cyber-taoist-docs/README.md` | Notes on vendoring vs upstream. |
| `oada.config.mjs` | Wires aiClient, agentContextDocs, action registry, handlers. |
| `run.mjs` | Drives one intel + exec cycle and prints visibility info. |
| `human-guidance.md` | Project-local clauses; not merged into constitution/skill. |

## Field passthrough check

After running, inspect:

```
examples/cyber-taoist-demo/data/evolution/pending_decisions.json
```

Each decision's `action` object will retain `layer`, `hypothesis`,
`success_signal`, `failure_signal`, and `death_boundary` exactly as the AI
proposed them, with no engine-side coercion.
