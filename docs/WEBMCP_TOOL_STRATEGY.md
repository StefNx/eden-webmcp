# WebMCP tool strategy

EDEN follows the current proposed WebMCP shape:
`document.modelContext.registerTool(tool, { signal })`. Site tools are a
progressive enhancement over a fully usable human interface.

## Design principles

- One purpose per tool, with stable nouns and IDs.
- Narrow JSON Schema plus matching Zod validation.
- Read tools advertise `readOnlyHint`.
- Every response includes `ok`, a concise verification message and the current
  design version.
- Human and agent changes use the same domain actions.
- Dynamic tools exist only when their prerequisite state exists.
- The visible UI is the confirmation and observability surface.

## Base tools

| Tool | Mode | Purpose |
|---|---|---|
| `get_mission_state` | Read | Constraints, validation, version and active-run summary. |
| `list_module_catalog` | Read | Exact kinds, costs, mass, ports and simplified behavior. |
| `inspect_design` | Read | Modules, positions, locks, typed edges and warnings. |
| `add_module` | Write | Add exactly one visible module. |
| `connect_modules` | Write | Add exactly one valid typed resource edge. |
| `update_module` | Write | Move, rename, enable or upgrade one module. |
| `remove_module` | Write | Remove one non-core module and its edges. |
| `set_mission_constraints` | Write | Change bounded mission values. |
| `run_simulation` | Write | Evaluate and publish the current design. |
| `reset_design` | Destructive | Restore the starter graph after `confirm: true`. |

## Dynamic result tools

- `analyze_latest_run` appears after one run and returns causal evidence,
  safety margins and non-prescriptive repair directions.
- `compare_runs` appears after two runs and returns outcome deltas plus an exact
  diff of the evaluated design snapshots.

Both are registered with an `AbortSignal`. Resetting or changing prerequisites
aborts obsolete registration before a new tool is installed.

## Human locks

A human can lock any module in the visible graph or inspector. Agent writes that
update or remove the module—or connect an edge to either locked endpoint—fail
closed. The optional `overrideLocked: true` field is described as usable only
after explicit human authorization. It is a collaboration rule and demo of
human control, not an authentication boundary.

## Invocation observability

The developer panel lists the tools currently registered and the most recent
invocation:

- tool name and execution status;
- validated arguments (or raw arguments for a validation failure);
- structured result/error;
- design version at completion.

This is populated by the same wrapper around every registered tool, so it is not
a simulated debug display.

## Test coverage

`src/webmcp/registerEdenTools.test.ts` installs a standards-shaped
`ModelContext` and verifies:

1. 10 base registrations;
2. tool execution through the registered callbacks;
3. 11 tools after one run and 12 after two runs;
4. visible invocation records and validated arguments;
5. abort-driven cleanup;
6. locked-module rejection in the shared store boundary.

## Demo prompt

> Inspect the mission and current design. Run the default simulation with seed
> 424242. Use the causal evidence to repair the habitat so it survives all 500
> sols under the existing budget and mass limits. Preserve human-locked modules.
> Rerun with the same seed and compare the first and final runs.

Reference: [current WebMCP draft](https://webmachinelearning.github.io/webmcp/).
