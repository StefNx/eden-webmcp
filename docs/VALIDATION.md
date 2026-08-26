# Validation evidence

Validated on 26 August 2026. This document separates deterministic application
evidence from browser/runtime availability so the submission does not overclaim
experimental WebMCP support.

## Automated quality gate

```bash
npm run check
```

Current result:

- clean `npm ci --no-audit --no-fund`: pass;
- Oxlint: pass;
- Vitest: 4 files, 13 tests, all pass;
- TypeScript project build: pass;
- Vite production build: pass;
- production bundle: 497.25 kB JavaScript / 35.67 kB CSS before gzip.

The result above was produced from the committed lockfile after replacing the
local dependency tree with `npm ci`.

## Deterministic truth cases

All use seed `424242`.

| Case | Expected | Automated |
|---|---|---|
| Starter | `POWER_COLLAPSE` at S94 | Pass |
| Connected microreactor | `OXYGEN_RESERVE_BREACH` at S300 | Pass |
| Microreactor + redundant O₂ generator | Success at S500, $8.20M / 35.5t | Pass |
| Microreactor + O₂-connected storage | Success at S500, $7.90M / 40.5t | Pass |
| Extra storage connected only to water | Adds no oxygen inventory | Pass |
| Identical design + seed | Identical causal telemetry | Pass |
| Run comparison | Uses immutable design snapshots | Pass |

## Store and collaboration

Automated coverage verifies:

- design mutations version and emit actor-tagged activity;
- undo/redo restore the current design without deleting run history;
- locked modules reject agent updates/removal/endpoint connections;
- the guided reset returns to a clean starter state;
- demo routes build the expected three-run story through normal actions.

## WebMCP adapter

A standards-shaped `ModelContext` harness executes the actual registered
callbacks, not the underlying actions directly.

Verified:

- 10 base tools on registration;
- `analyze_latest_run` appears after one run;
- `compare_runs` appears after two runs;
- abort cleanup unregisters obsolete tools;
- validated arguments, result, status and design version reach the developer
  panel state;
- full tool flow reaches S94 failure → S300 failure → S500 success;
- a human greenhouse lock rejects an agent update;
- first/final comparison reports +406 survived sols and the exact design diff.

## Browser validation

### Human UI without WebMCP

Pass in the Codex in-app browser at `http://127.0.0.1:4173/?demo=success`:

- page title and progressive-enhancement fallback render;
- S500 / $7.90M / 40.5t state is correct;
- human lock and HUMAN/AGENT/SYSTEM activity are visible;
- four telemetry plots and both scenario bands render;
- animated counter settles at `SOL 500`;
- zero console errors after a fresh reload.

The local in-app browser build used for this check did not expose
`document.modelContext`; the UI correctly reported “WebMCP unavailable.”

### Browser with WebMCP-shaped runtime

Pass at 1440×900 and 1920×1080:

- live badge moves 10 → 11 → 12 tools;
- tool callbacks mutate the visible graph;
- both failures and final success render;
- lock rejection is returned to the agent;
- comparison and developer diagnostics render;
- zero console errors.

This harness validates EDEN's integration behavior but is not a substitute for
the final native-agent test. The deployed HTTPS URL must be opened in a
WebMCP-capable ChatGPT in-app browser before recording.

## Manual pre-submission checklist

- [ ] Deploy the final commit over HTTPS.
- [ ] Confirm the native badge shows 10 tools on the deployed URL.
- [ ] Perform the full prompt with a supported site-tools model.
- [ ] Confirm 12 tools after two runs and inspect the final invocation.
- [ ] Record the 1920×1080 demo with audible narration under 2:45.
- [ ] Verify the public repository, MIT license and live URL while signed out.
- [ ] Run the Devpost submission links from a private window.
