# EDEN feasibility study

## Verdict

EDEN is feasible for the WebMCP Challenge **as a compact deterministic systems-design simulator**, not as a high-fidelity Mars engineering model. The winning version should make causal trade-offs obvious and reproducible in under three minutes.

## What we can credibly build

### Core simulation

A daily/sol timestep engine tracks:

- power generation, demand and battery storage;
- water inventory and wastewater recovery;
- oxygen production and reserve;
- CO₂ production and scrubbing;
- food inventory and greenhouse production;
- spare-parts consumption;
- cost, mass and emergency-reserve constraints;
- scripted, seeded disruptions.

This is computationally trivial in the browser. Five hundred timesteps across tens of modules completes nearly instantly. The difficult work is product design, causal explanations, UI polish and WebMCP reliability—not raw compute.

### Shared visual world

React Flow is a strong fit for a typed module graph. Humans can drag and lock modules; WebMCP calls stable IDs and typed resources. The simulator reads the same graph state.

### WebMCP

The page can register tools on `document.modelContext` with JSON-schema inputs and imperative execute handlers. EDEN uses progressive enhancement: without WebMCP the site still functions manually.

### Deployment

No backend is required for the challenge MVP. The app can be built to static assets and hosted over HTTPS. This reduces operational risk and removes authentication/API-key complexity from the demo.

## What would make the project fail

- Attempting continuous fluid dynamics, real thermodynamics or NASA-grade ECLSS fidelity.
- Building a generic city-builder before the core agent/simulator loop works.
- Using the language model to invent simulation outcomes.
- Shipping dozens of overlapping tools that confuse discovery.
- Depending on external APIs during the demo.
- Making the graph beautiful but the failure evidence opaque.
- Hiding the reason a design succeeds or fails.

## Deliberate model simplifications

- One-sol discrete updates rather than continuous physics.
- Aggregate resource buses rather than pipe pressure/voltage simulation.
- Fixed public module coefficients.
- Scripted scenario events with seeded weather jitter.
- All crew share aggregate resource demand.
- A module is operational only when enabled and connected into the visible graph.
- Failure thresholds are pedagogical, not certification limits.

The UI and README must explicitly label EDEN as educational systems design.

## MVP mission

**Ares Gauntlet**

- 12 crew.
- 500 sols.
- Budget: $8.5M.
- Mass: 45,000 kg.
- Minimum water reserve: 20 sols.
- Minimum oxygen reserve: 10 sols.
- 45-sol dust storm from sol 80.
- One oxygen generator disabled for 25 sols from sol 280.

The starter design deliberately fails during the dust storm. A known resilient design adds dust-independent power and oxygen redundancy while remaining under budget and mass limits.

## Recommended build order

### Phase 1 — truth engine

- Lock domain types and unit conventions.
- Tune starter failure and resilient success.
- Add deterministic tests and explainable failure codes.
- Add run comparison.

### Phase 2 — shared workspace

- Finish React Flow node and edge editing.
- Add module inspector, human locks and agent action feed.
- Add resource charts with scenario bands and failure markers.
- Make every state change visually obvious.

### Phase 3 — WebMCP quality

- Test tool discovery and execution in the actual supported browser.
- Tighten names/descriptions/schema boundaries.
- Dynamically register result tools only after runs exist.
- Return precise IDs, design versions and verification summaries.

### Phase 4 — challenge polish

- Deploy a stable HTTPS URL.
- Add an in-product guided demo reset.
- Record the exact 2:20–2:40 demo path repeatedly.
- Finish README, screenshots, architecture diagram and submission copy.

## Stretch goals after the primary demo is stable

- Adversary mode with `inject_failure` tools.
- Alternate Moon/undersea/Antarctic scenarios sharing the same engine.
- Shareable design codes.
- Pareto chart for cost vs. resilience.
- Agent batch timeline and rollback.
- Leaderboard using server persistence.

## Main technical risks and mitigations

| Risk | Mitigation |
|---|---|
| WebMCP API changes | Isolate all browser-specific code under `src/webmcp/`; feature detect and type locally. |
| Agent chooses invalid calls | Zod validation, narrow enums, explicit errors and a read-only catalog tool. |
| Tool state differs from UI | Both call the same `edenStore.actions`; no duplicate agent state. |
| Demo outcome varies | Seeded PRNG and regression tests for starter failure and resilient success. |
| Canvas becomes visually noisy | Keep nine module types, short edge labels and a guided layout. |
| Scientific criticism | Publish assumptions and disclaimers; frame as educational systems design. |
| Time pressure | Static app, one scenario, no login, no backend, no external API. |
