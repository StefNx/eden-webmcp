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
- Vitest: 4 files, 15 tests, all pass;
- TypeScript project build: pass;
- Vite production build: pass;
- production `dist/` preview at `/?demo=success`: pass with zero console errors;
- production bundle: 498.16 kB JavaScript / 35.67 kB CSS before gzip.
- GitHub Actions PR quality job: pass from `npm ci`.
- npm audit: zero known vulnerabilities.

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
- first/final comparison reports +406 survived sols and the exact design diff;
- comparison output is compact, rounds reserve deltas and omits full telemetry
  and design snapshots.
- Chrome-native execution remains compatible when the user agent omits the
  optional execution-options object.

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

### Native Chrome WebMCP execution

Pass in Chrome 151.0.7922.174 with
`chrome://flags/#enable-webmcp-testing` enabled. The test used the official
Chrome DevTools MCP 1.8.0 WebMCP debugger against the production build; it
listed EDEN's page tools and executed them through Chrome's native WebMCP
runtime rather than a page mock.

Verified native sequence with seed `424242`:

- Chrome discovers 10 base tools, then 12 after two stored runs;
- `get_mission_state` reads the same state shown by the UI;
- the first run returns `POWER_COLLAPSE` at S94;
- native `add_module` and `connect_modules` add the microreactor and the next
  run returns `OXYGEN_RESERVE_BREACH` at S300;
- human UI clicks cap the budget at $7.95M and lock `greenhouse-a`;
- native `update_module` is rejected with the human-lock explanation;
- native tools add and connect oxygen storage; the final run succeeds at S500,
  $7.90M and 40.5t;
- native `compare_runs` reports +406 survived sols, the cause transition
  `POWER_COLLAPSE` → `MISSION_SURVIVED`, both added modules/connections, the
  human lock and the changed budget constraint;
- the visible developer panel records `run_simulation` and `compare_runs`, and
  the final UI shows 12 tools, the lock and HUMAN/AGENT/SYSTEM activity.

The first native call exposed a compatibility defect: Chrome did not supply an
execution-options object, while EDEN unconditionally read `options.signal`.
The adapter now creates a local non-aborted signal when options are absent, and
the 15th automated test preserves that behavior.

### Browser with WebMCP-shaped runtime

Pass at 1440×900 and 1920×1080:

- live badge moves 10 → 11 → 12 tools;
- tool callbacks mutate the visible graph;
- both failures and final success render;
- lock rejection is returned to the agent;
- comparison and developer diagnostics render;
- zero console errors.

This harness remains useful for viewport coverage. The native Chrome test above
is the authoritative local runtime proof; the final deployed HTTPS URL still
needs one signed-out availability check before recording.

## Manual pre-submission checklist

- [ ] Deploy the final commit over HTTPS.
- [ ] Confirm the native badge shows 10 tools on the deployed URL.
- [x] Perform the full prompt locally through Chrome's native WebMCP runtime.
- [x] Confirm 12 tools after two runs and inspect the final invocation.
- [ ] Record the 1920×1080 demo with audible narration under 2:45.
- [ ] Verify the public repository, MIT license and live URL while signed out.
- [ ] Run the Devpost submission links from a private window.
