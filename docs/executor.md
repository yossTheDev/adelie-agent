# Executor

The executor runs plans deterministically in order.

## Context Piping

- `$$step_id` references previous step outputs.
- In loops, embedded placeholders are supported inside strings:
  - `$$item`
  - `$$index`
  - `$$loopCounter`

Example:

`"path": "C:\\temp\\file-$$item.txt"`

## Control Flow

- `FOR_EACH`
  - Supports array, CSV string, and JSON-array string inputs.
  - Supports single object or array templates.
  - Propagates nested failures to parent loop result.
- `IF`
  - Supports direct boolean values, refs, and deterministic logical expressions/actions.
- `WHILE`
  - Same condition support as `IF`.
  - Enforced max iteration limit from config (`max_loop_iterations`).

## Logic Integration

Conditions can evaluate:

- Deterministic actions (`AND`, `OR`, `NOT`, comparisons, etc.)
- Expression strings like `AND(TRUE,FALSE)` or `LESS_THAN(1,2)`
- Fallback to `LOGIC_GATE` only when explicitly needed.
