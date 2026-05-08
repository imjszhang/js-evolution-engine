# Vendored Cyber-Taoist documents (demo only)

These files are **snapshots** copied from the upstream [cyber-taoist](https://github.com/) repository’s `docs/` folder so this example runs **without** a sibling checkout or extra clone.

| File | Upstream meaning | Copied revision (see file header) |
|------|------------------|-----------------------------------|
| `CONSTITUTION.md` | 进化学宪章 | v1.0.1 (header inside file) |
| `SKILL.md` | 进化学应用指南 | v2.0.0 (header inside file) |

- **Canonical source & versioning** live in the cyber-taoist repo. Refresh this folder when upstream releases change and you want the demo to match.
- **`oada.config.mjs`** reads from this directory by default. To use a different directory instead, set **`CYBER_TAOIST_DOCS_DIR`**.

The demo **never writes** to these markdown files.
