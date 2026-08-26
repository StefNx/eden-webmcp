# WebMCP tool strategy

## Principles

- One purpose per tool.
- Stable nouns and IDs.
- Narrow JSON schemas with enums and bounds.
- Read tools advertise `readOnlyHint`.
- Every write returns the new design version and affected object.
- Result tools are dynamically available only when their prerequisite state exists.
- Human UI remains the canonical visible confirmation surface.

## Base tools

| Tool | Mode | Purpose |
|---|---|---|
| `get_mission_state` | read | Constraints, validation, version and active run. |
| `list_module_catalog` | read | Exact modules, costs, mass, ports and capabilities. |
| `inspect_design` | read | Modules, positions, locks, edges and warnings. |
| `add_module` | write | Add exactly one module. |
| `connect_modules` | write | Add exactly one typed resource edge. |
| `update_module` | write | Move/rename/enable/upgrade one module. |
| `remove_module` | write | Remove one module and its edges. |
| `set_mission_constraints` | write | Change bounded mission values. |
| `run_simulation` | write | Evaluate the current design and publish the result in the UI. |
| `reset_design` | destructive | Return to the deterministic starter state after explicit confirmation. |

## Dynamic result tools

- `analyze_latest_run` appears only after a run exists.
- `compare_runs` appears only after at least two runs exist.

A later adversary mode may dynamically replace edit tools with narrowly constrained failure-injection tools, but it is not required for the MVP.

## Human locks

A human can lock a module in the visible UI. Agent writes to that module return an error unless `overrideLocked: true`. The description explicitly says that override must follow human authorization. This is not a security boundary; it is a collaboration rule and a visible demonstration of human control.

## Example challenge prompt

> Inspect the mission and current design. Run the default simulation with seed 424242. Use the failure evidence to repair the habitat so it survives all 500 sols under the existing budget and mass limits. Preserve human-locked modules. Rerun with the same seed and compare the two runs.
