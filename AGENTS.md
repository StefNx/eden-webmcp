# AGENTS.md — EDEN contributor contract

## Product north star

EDEN must demonstrate a real human-agent collaboration loop:

> Human sets intent and trade-offs → agent builds through WebMCP → deterministic simulator judges → human intervenes → agent repairs.

Do not turn EDEN into a chatbot, a static dashboard or a scientifically overclaimed Mars simulator.

## Repository map

- `src/domain/`: stable types, module catalog and seeded scenarios.
- `src/simulation/`: pure deterministic simulation. No React, DOM or network access.
- `src/store/`: the single application state and domain actions used by UI and WebMCP.
- `src/webmcp/`: WebMCP type declarations and tool registration.
- `src/components/`: human-facing React UI.
- `docs/`: feasibility, architecture, tool strategy and implementation brief.

## Hard constraints

1. The same store/domain actions must back both UI interactions and WebMCP tools.
2. The simulator must be deterministic for identical design + scenario + seed.
3. Never hide a simulation failure or manufacture a success for the demo.
4. Human locks must fail closed for agent edits unless an explicit override is supplied.
5. Tool schemas must be narrow, validated with Zod and return enough state to verify effects.
6. Preserve a fully usable human UI when WebMCP is unavailable.
7. Do not add an OpenAI API key or a chat box; ChatGPT is the agent surface.
8. Do not claim scientific fidelity. Keep coefficients visible and documented.
9. Favor a polished, reliable challenge demo over broad simulation scope.
10. Keep the app static-deployable unless a feature absolutely requires a backend.

## Commands

```bash
npm install
npm run dev
npm run lint
npm run test:run
npm run build
npm run check
```

## Definition of done for every change

- TypeScript build passes.
- Existing deterministic tests pass; new domain behavior has tests.
- Manual UI path still works without WebMCP.
- Relevant tool result visibly updates the shared page.
- No console errors in the normal demo flow.
- README/docs updated when behavior or tool semantics change.

## Implementation priorities

1. Make the seeded failure and resilient success deterministic and visually legible.
2. Finish the human/agent handoff: locks, diff-like action feed and run comparison.
3. Polish the three-minute demo path.
4. Add secondary scenarios only after the primary path is stable.
5. Treat adversary/red-team mode and sharing/leaderboards as stretch goals.
