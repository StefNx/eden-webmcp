# EDEN architecture

```text
Human UI ─────────────┐
                      │
WebMCP execute() ─────┼──> edenStore.actions ──> HabitatDesign vN
                      │                             │
                      └─────────────────────────────┤
                                                    v
                                           deterministic engine
                                                    │
                                                    v
                                    SimulationRun + causal evidence
                                                    │
                                  ┌─────────────────┴──────────────┐
                                  v                                v
                             visible UI                   WebMCP read tools
```

## Boundaries

### Domain

Types, catalog values and scenario definitions. No React or browser dependencies.

### Simulation

A pure function:

```ts
runSimulation(design, seed) -> SimulationRun
```

Identical inputs must produce identical causal outcomes and telemetry, ignoring metadata such as run ID timestamp.

### Store

The only mutable application state. It owns design versioning, human locks, run history and the shared action surface. UI and WebMCP never edit arrays directly.

### WebMCP adapter

Feature-detects `document.modelContext`, registers narrow tools and maps validated inputs to store actions. Registration uses `AbortController` so result-aware tools can appear and disappear with page state.

### UI

Renders the store and calls the same actions as the agent. React Flow is presentation and interaction—not the source of truth.

## Data integrity rules

- Every design mutation increments `design.version`.
- Every run records the version and seed it evaluated.
- Agent changes to human-locked modules fail closed.
- Disconnected modules remain visible but are ignored by simulation and listed in validation.
- Budget and mass are computed from the catalog, never trusted from tool input.
- The simulator decides outcomes; WebMCP handlers cannot override them.
