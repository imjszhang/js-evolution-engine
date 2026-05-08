# cyber-taoist-demo

A reference host configuration showing how to layer an external protocol
(here: the [cyber-taoist](https://github.com/) `CONSTITUTION.md` + `SKILL.md`)
on top of `js-evolution-engine` using `agentContextDocs` — without forking
the engine and without copying the upstream documents.

This demo intentionally stays narrow:

- **Reads** the two cyber-taoist documents from a sibling checkout (or
  `CYBER_TAOIST_DOCS_DIR`); never modifies them.
- **Injects** them verbatim into the analyze/decide prompt via
  `agentContextDocs`.
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

The cyber-taoist documents must be reachable. Two options:

1. **Sibling checkout (default):** clone the cyber-taoist repository next to
   `js-evolution-engine`:
   ```
   <parent-dir>/
     js-evolution-engine/
     cyber-taoist/
       docs/
         CONSTITUTION.md
         SKILL.md
   ```
2. **Custom location:** set `CYBER_TAOIST_DOCS_DIR` to an absolute path
   pointing at the directory that contains those two files.

## Run

```bash
# from the repo root, with cyber-taoist available as described above:
node examples/cyber-taoist-demo/run.mjs

# or with an explicit path:
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
|---|---|
| `oada.config.mjs` | Wires aiClient, agentContextDocs, action registry, handlers. |
| `run.mjs` | Drives one intel + exec cycle and prints visibility info. |
| `human-guidance.md` | Project-local clauses that should NOT be added to the universal cyber-taoist documents. Maintained by the host operator. |

## Field passthrough check

After running, inspect:

```
examples/cyber-taoist-demo/data/evolution/pending_decisions.json
```

Each decision's `action` object will retain `layer`, `hypothesis`,
`success_signal`, `failure_signal`, and `death_boundary` exactly as the AI
proposed them, with no engine-side coercion.
