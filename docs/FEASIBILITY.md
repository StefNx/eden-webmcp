# EDEN feasibility and scope

## Verdict

EDEN is feasible and implemented as a compact deterministic systems-design
simulator. It deliberately does not attempt high-fidelity Mars engineering. The
challenge value is an honest, inspectable human-agent-simulator loop that fits
inside a public demo under three minutes.

## Implemented mission

**Ares Gauntlet**

- 12 crew for 500 sols;
- $8.5M initial budget and 45,000 kg mass limit;
- at least 20 sols of water and 10 sols of oxygen reserve;
- 45-sol dust storm from S80 through S124;
- primary oxygen-generator outage from S280 through S304.

The browser computes 500 one-sol timesteps over a small module graph almost
instantly. The hard product problems—causal explanations, shared state,
observability, human control and demo reliability—are implemented around that
engine.

## Credible model

The simulator tracks aggregate:

- generation, demand and battery storage;
- water inventory and wastewater recovery;
- oxygen production and reserve;
- carbon-dioxide production and scrubbing;
- food inventory and greenhouse production;
- spare-parts consumption;
- cost, mass, reserve and topology constraints;
- scripted disruptions plus seeded weather jitter.

It models explicit per-resource routing, not fluid pressure, voltage, heat or
continuous thermodynamics. All coefficients are public in source and the UI.

## Seeded causal ladder

With seed `424242`:

1. the starter fails with `POWER_COLLAPSE` at S94;
2. a connected microreactor reaches the outage and fails with
   `OXYGEN_RESERVE_BREACH` at S300;
3. microreactor plus connected redundant oxygen generation survives S500 at
   $8.20M / 35.5t;
4. microreactor plus explicitly O₂-connected storage is a materially different
   survivor at $7.90M / 40.5t.

Regression tests guard all four outcomes and prove that a water-only storage
connection does not contribute oxygen.

## Deliberate simplifications

- One-sol discrete updates.
- Aggregate typed resource buses.
- Fixed public module coefficients.
- Scripted events with seeded solar jitter.
- Aggregate crew consumption.
- Pedagogical reserve and failure thresholds.

EDEN is educational systems design, not scientific mission planning or
life-support certification.

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| Experimental WebMCP API changes | Browser adapter and ambient types are isolated under `src/webmcp/`; current registration and abort semantics are tested. |
| Invalid agent calls | Narrow schemas, Zod, stable IDs, catalog discovery and explicit failures. |
| Tool/UI divergence | Both call one store action surface; no agent-only state. |
| Demo variability | Fixed seed, immutable run snapshots and four outcome regressions. |
| Opaque causality | First failure point, evidence, scenario bands and non-prescriptive directions are visible and returned. |
| Human loses control | Visible locks fail closed; activity identifies HUMAN, AGENT and SYSTEM. |
| Scientific overclaim | Assumptions drawer, source ledger and explicit disclaimer. |
| Hosting risk | Static build, no secrets, backend, login or runtime API. |

## Intentionally excluded

Accounts, multiplayer, live NASA feeds, 3D terrain, continuous physics, a
leaderboard, generalized scenario editor and adversary mode remain outside the
challenge MVP.
