# EDEN

> **AI builds. Reality attacks. Human decides.**

EDEN is a human-agent closed-loop habitat design simulator for the 2026 WebMCP Challenge. A human defines the mission and the acceptable trade-offs. An AI agent manipulates the same visible habitat graph through narrow WebMCP tools. A deterministic simulator—not the language model—decides whether the colony survives.

## What is already scaffolded

- React + TypeScript + Vite single-page app.
- Node-based habitat canvas powered by React Flow.
- Pure, seeded, daily-timestep simulation engine.
- A starter mission with a 45-sol dust storm and one oxygen-generator outage.
- Cost, mass, emergency-reserve and topology validation.
- Ten base WebMCP tools plus result-aware tools registered dynamically.
- Human module locks that agent actions must honor.
- Determinism and mission-outcome tests.
- GitHub Actions and static Netlify configuration.

The seeded starter habitat is intentionally under-resilient. It should fail during the dust storm. A connected microreactor and redundant oxygen generator provide a known budget-compliant route to survival, but they are not the only strategy the final product should support.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:4173`.

Quality gate:

```bash
npm run check
```

## Test WebMCP

Use the current ChatGPT in-app browser with a supported site-tools model, or enable Chrome's WebMCP testing flag for local development. The human UI works normally when `document.modelContext` is unavailable.

A strong first agent prompt is:

> Inspect the mission and the current design. Run the seeded simulation. Explain the causal failure, then repair the habitat so all 500 sols survive under the existing budget and mass limits. Respect every human-locked module. Use the same seed for comparison.

## Core interaction loop

1. Human chooses mission constraints and can lock modules.
2. Agent reads the exact live design through WebMCP.
3. Agent adds, connects, moves or upgrades modules.
4. EDEN runs a reproducible simulation.
5. The simulator returns causal evidence and safety margins.
6. Human changes priorities.
7. Agent revises the same visible design and compares runs.

## Why WebMCP matters

Without WebMCP, a browser agent would need to visually target small graph handles and infer hidden module IDs, resource types and mission state. EDEN instead exposes typed operations such as `add_module`, `connect_modules`, `inspect_design` and `run_simulation`. Every tool calls the same domain actions as the human interface, so the page cannot drift into a separate “agent-only” state.

See:

- `docs/FEASIBILITY.md`
- `docs/ARCHITECTURE.md`
- `docs/WEBMCP_TOOL_STRATEGY.md`
- `docs/CODEX_BUILD_PROMPT.md`
- `AGENTS.md`

## Scope and honesty

EDEN is an educational systems-design simulator. Its coefficients are intentionally simplified and exposed in code. It is **not** scientific mission-planning, life-support certification or safety-critical engineering software. The challenge value is the human-agent-simulator interaction pattern, not a claim to reproduce NASA-grade physics.

## Deployment

This is a static application. Build with `npm run build` and deploy `dist/` to Netlify, Vercel, Cloudflare Pages or another HTTPS host. `netlify.toml` is included.

## License

MIT. See `LICENSE`.
