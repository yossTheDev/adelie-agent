# Changelog

## v1.0.0

### Added
- Deterministic control-flow support improvements in executor:
  - Robust `FOR_EACH` with CSV/JSON array parsing and object/array templates
  - Embedded placeholder replacement for loop variables (`$$item`, `$$index`, `$$loopCounter`) inside strings
  - Deterministic condition evaluation for `IF` / `WHILE` using logical actions
- Extended deterministic logic/action catalog:
  - Boolean gates: `NOT`, `AND`, `OR`, `XOR`, `NAND`, `NOR`
  - Numeric comparisons: `GREATER_THAN`, `GREATER_OR_EQUALS`, `LESS_THAN`, `LESS_OR_EQUALS`
  - Numeric basics: `ADD`, `SUBTRACT`
- New core state actions:
  - `STATE_SET`
  - `STATE_CLEAR`
- New system action:
  - `SYSTEM_INFO`
- Persistent user-level agent configuration in:
  - `~/.yi-agente/config.json`
- Persistent MCP server registry in:
  - `~/.yi-agente/mcp.json`
- New CLI management commands:
  - `yi config show|set|reset|path`
  - `yi mcp list|install|remove|path`
- Exhaustive plan test harness in `plan-tests`:
  - Fixture-based execution
  - Assertions for `FOR_EACH`, `IF`, `WHILE`, and state flows

### Changed
- Planner prompt strengthened for deterministic logic-first planning.
- Planner examples are now correctly injected into the planning prompt.
- Planner output is sanitized/normalized before execution:
  - Unknown actions are removed
  - Invalid/extra args are filtered
  - Control-flow args are normalized (`template`, `then/else`, `body`)
- CLI UX improved:
  - English-only runtime text
  - Rich execution plan rendering
  - Banner with active model and action count
- Runtime config is now loaded dynamically, allowing model and endpoint changes without code edits.

### Reliability
- Filesystem operations include post-operation verification for stronger determinism.
- Loop execution failure propagation improved for nested control-flow actions.
- Max loop iterations are configurable via config (`max_loop_iterations`).
