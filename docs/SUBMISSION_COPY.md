# EDEN submission copy

## Project name

**EDEN — AI builds. Reality attacks. Human decides.**

## One-line description

A visual habitat simulator where a human and an AI agent co-design the same
resource network through WebMCP, while a deterministic reality engine judges
every trade-off.

## Short description

EDEN turns a browser-based systems simulator into a shared human-agent
workspace. The agent can inspect, edit, connect, simulate, diagnose and compare
a Mars habitat using typed WebMCP site tools. The human can change constraints
or lock modules at any time. A seeded 500-sol engine produces visible telemetry
and causal failures, so neither participant can talk the design into succeeding.

## Full description

Most browser agents operate one step removed from the product: they infer UI
structure, click controls and maintain a fragile mental copy of application
state. EDEN asks what becomes possible when a complex visual application exposes
its real domain operations directly.

The Ares Gauntlet mission asks twelve crew to survive 500 sols through a
45-sol dust storm and a primary oxygen-system outage. The starter design fails
at sol 94 when its battery collapses. An agent inspects that evidence and
connects dust-independent power; the next run reaches sol 300 and reveals an
oxygen-reserve breach. Then the human locks the greenhouse and reduces the
budget below $8M. The agent must adapt without touching the lock, choosing a
lower-cost oxygen reserve strategy. The final habitat survives all 500 sols at
$7.90M.

Every change happens in one visible React Flow graph. The human interface and
all WebMCP handlers call the same store actions. Every mutation is versioned and
attributed to HUMAN, AGENT or SYSTEM. Historical runs retain deep snapshots, so
the comparison can prove exactly which modules, connections, locks and
constraints changed.

The simulator is deliberately compact and honest: one-sol timesteps, aggregate
resource buses, public coefficients and seeded disruptions. It is educational
systems design, not scientific mission planning.

## Why WebMCP is essential

Without WebMCP, an agent must visually target small graph ports, infer resource
types, recover internal module IDs and scrape dense telemetry. EDEN exposes
those semantics as 10 narrow base tools with validated JSON inputs. The agent
can read the catalog and live design, add one module, connect one typed bus,
change bounded constraints and run the same simulator the human sees.

The available tool surface also follows state. `analyze_latest_run` appears
only after one result exists; `compare_runs` appears after two. Abortable
registration removes obsolete result tools. A developer panel makes the last
invocation, validated arguments, result and design version visible to judges.

WebMCP is not decorative automation here. It is what makes a high-dimensional
visual system reliably co-editable while preserving a human-controlled,
auditable shared world.

## Usefulness and potential impact

EDEN demonstrates a reusable pattern for applications where an agent may propose
or execute changes but should not own the truth: digital twins, logistics
planning, energy models, architecture tools, incident simulations, budgets and
scientific notebooks. A deterministic domain engine supplies reality; structured
site tools supply reliable action; visible locks and history preserve human
agency.

## Originality

The core mechanic is progressive causal discovery. A correct repair does not end
the story—it lets the same design survive long enough to encounter the next
failure. The human then changes the objective midstream, forcing the agent to
adapt under a visible lock and tighter budget. Dynamic result tools, immutable
design snapshots and per-resource graph reachability make the collaboration
inspectable instead of theatrical.

## Technical execution

- React 19, TypeScript 6, Vite and React Flow;
- custom shared store with versioning, undo/redo and actor activity;
- pure seeded 500-step simulator with public assumptions;
- Zod-validated imperative WebMCP tools;
- abortable state-dependent tool registration;
- four synchronized telemetry charts with scenario and failure markers;
- static HTTPS deployment, no backend, account, secret or external runtime API;
- 13 automated tests plus 1440×900 and 1920×1080 browser validation.

## Challenges and lessons

The subtle simulation bug was not random noise but topology: an early
implementation let any connection activate every inventory on a multi-resource
storage module. EDEN now computes reachability per bus and has a regression test
that water-only storage contributes no oxygen.

A second lesson was that collaboration history and simulation history are
different. Undoing a design mutation should change the current graph but must
never rewrite the snapshot used by an earlier run. Separating those lifecycles
made comparison trustworthy.

Finally, experimental browser APIs need observable degradation. When WebMCP is
absent, EDEN remains fully usable and says so; when it is present, judges can see
the live tool count and exact last invocation.

## Known limitations

- Simplified educational coefficients, not validated Mars/ECLSS physics.
- One mission and one aggregate resource model.
- No persistence, accounts, multiplayer or server-side audit log.
- Human locks are a collaboration contract, not an authentication boundary.
- WebMCP remains an experimental proposed standard and requires a supported
  browser/runtime.

## Suggested tags

`webmcp`, `human-agent collaboration`, `simulation`, `react`,
`typescript`, `deterministic systems`, `agent-native web`

## Submission assets

Use the repeatable `/?demo=starter`, `/?demo=failure` and `/?demo=success`
routes for screenshots. The repository root contains the MIT license,
installation instructions and Netlify configuration. Add the final public live
URL, public repository URL and public YouTube demo URL to the Devpost form only
after verifying each while signed out.
