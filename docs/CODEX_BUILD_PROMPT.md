# Codex implementation prompt

You are the lead engineer and product designer for EDEN, a WebMCP Challenge submission currently scaffolded in `StefNx/active1`. Work directly in that repository and continue until the acceptance criteria below are met. The repository will later be renamed to `eden-webmcp` and made public for submission.

## Product

EDEN is not a chatbot. It is a visual, deterministic closed-loop habitat simulator where:

1. a human sets mission goals and trade-offs;
2. an agent manipulates the same visible habitat through WebMCP tools;
3. a deterministic simulator decides whether the habitat survives;
4. the human locks modules or changes priorities;
5. the agent repairs and compares designs.

Tagline: **AI builds. Reality attacks. Human decides.**

Read `README.md`, `AGENTS.md` and every file under `docs/` before changing code. Inspect the existing implementation rather than replacing it blindly.

## Non-negotiable architecture

- React + TypeScript + Vite.
- React Flow canvas.
- Pure deterministic simulation under `src/simulation/`.
- One custom store whose actions are used by both UI and WebMCP.
- Zod validation for every tool input.
- Progressive enhancement when `document.modelContext` is absent.
- No OpenAI API key, embedded chat UI, backend, login or external runtime API.
- Static deployment.
- Educational simulator disclaimer; no NASA-grade claims.

## First task: audit and make the scaffold green

1. Install dependencies and commit the generated lockfile.
2. Run `npm run lint`, `npm run test:run` and `npm run build`.
3. Fix every TypeScript, React Flow, WebMCP typing, lint and test issue.
4. Verify the current WebMCP API against current official documentation; keep browser-specific types isolated under `src/webmcp/`.
5. Confirm the seeded causal ladder with seed `424242`:
   - starter design fails with `POWER_COLLAPSE` at sol 94;
   - adding only a connected microreactor reaches the oxygen outage and fails with `OXYGEN_RESERVE_BREACH` at sol 300;
   - adding a connected microreactor plus a second connected oxygen generator survives 500 sols at $8.2M and 35.5t;
   - adding a connected microreactor plus a second connected storage module is a distinct surviving strategy at $7.9M and 40.5t.
6. Add or preserve regression tests for all four outcomes whenever coefficients change.

Do not weaken tests merely to make them pass. If the model is inconsistent, correct the engine or fixtures and document the change.

## Complete the challenge MVP

### Simulator truth and explanations

- Keep design + scenario + seed reproducible.
- Add a compact run-comparison model with deltas in survival, cost, mass, reserve margins and failure cause.
- Add scenario start/end markers to telemetry.
- Ensure every failure has causal evidence and actionable but non-prescriptive directions.
- Expose all simplified coefficients in code and add a visible “model assumptions” drawer.
- Ensure disconnected resource modules cannot silently contribute inventories merely because one unrelated edge touches them; either model per-resource reachability correctly or document and test a simpler explicit rule.

### Human workspace

- Finish reliable node placement, connection, deletion, selection and module editing.
- Add a module inspector with level, enabled state, cost, mass and human lock.
- Add a visible activity feed distinguishing HUMAN, AGENT and SYSTEM actions.
- Add undo/redo for design mutations, but never alter historical run snapshots.
- Show a clear diff between the design versions used by two selected runs.
- Add an explicit guided-demo reset.

### Visualization

- Make dust-storm and outage periods visually obvious on the timeline.
- Plot at least battery, power balance, water reserve and oxygen reserve.
- Animate the sol counter during a run without making the simulation nondeterministic.
- Clearly reveal the first causal failure point.
- Preserve a refined dark mission-control aesthetic at 1440×900 and 1920×1080.
- Meet keyboard navigation, focus-visible and contrast basics.

### WebMCP

- Keep base tools narrow and non-overlapping.
- Dynamically register `analyze_latest_run` only after a run and `compare_runs` only after two runs, using abortable registration if supported by the current API.
- Add an in-app developer panel listing registered tools, last invocation, validated arguments, result and design version.
- Make tool outputs concise but sufficient to verify effects.
- Ensure human-locked modules fail closed for agent writes unless `overrideLocked: true` follows explicit human authorization.
- Add tests around the adapter/domain boundary where practical.
- The UI and tool handlers must continue calling the same store actions; never create a separate agent-only state.

### Demo path

Optimize the product for this exact two-and-a-half-minute flow:

1. Show the starter mission and live WebMCP tool badge.
2. Prompt the agent to inspect and run the starter design.
3. The habitat fails visibly during the dust storm.
4. The agent reads causal evidence, adds and connects dust-independent power, then reruns with the same seed.
5. The second run reaches the oxygen outage and fails on the reserve requirement.
6. The human locks the greenhouse and reduces the budget below $8.0M.
7. The agent adapts without touching the lock, choosing a lower-cost reserve strategy.
8. The final run survives 500 sols at approximately $7.9M.
9. Compare the first and final runs in the UI.

The demo must be honest: no hard-coded success path outside the simulator.

## Challenge deliverables

- Production-ready README with install, test, deploy and WebMCP instructions.
- MIT license visible.
- Architecture diagram in the README or docs.
- Netlify deployment verified; add Vercel or Cloudflare config only if useful.
- `docs/DEMO_SCRIPT.md` with a timed script under 2:45.
- `docs/SUBMISSION_COPY.md` with project description, WebMCP explanation, impact, originality and known limitations.
- Screenshots or a repeatable screenshot route/state.
- CI running lint, tests and build.

## Scope guard

Do not add multiplayer, accounts, real NASA data feeds, 3D terrain, complex thermal physics, a leaderboard or a generalized scenario editor until the primary demo is polished and all quality gates pass. Adversary mode is optional only after that point.

## Working method

- Make small coherent commits with descriptive messages.
- Keep `AGENTS.md` current.
- After each meaningful phase, run the full quality gate.
- Review your own diff for correctness, accessibility, security and demo clarity.
- Never leave placeholder buttons, fake metrics or dead tools.
- Prefer finishing and polishing the primary mission over increasing breadth.

## Final acceptance criteria

- `npm run check` succeeds from a clean install.
- Static production build works.
- Starter run fails reproducibly for a causal reason.
- At least two materially different, non-hard-coded and budget-compliant designs survive reproducibly.
- Human UI works without WebMCP.
- A supported agent can inspect, edit, run, diagnose and compare through WebMCP.
- Human locks are respected.
- The full demo can be performed reliably in under 2:45.
- README and submission docs accurately describe capabilities and limitations.

Start by auditing the scaffold and reporting the concrete failures you find. Then implement, test and validate the project rather than only proposing changes. Continue autonomously through the acceptance criteria; ask only when a decision is genuinely impossible to infer from the repository and this brief.
