# Testing

Plan-level integration tests live in `plan-tests`.

## Runner

- `plan-tests/run-plan-tests.ts`
- Command: `yarn test:plans`

## Strategy

- Fixture-driven plans in `plan-tests/fixtures`.
- Each fixture is executed with `runPlan`.
- Assertions validate deterministic outcomes on filesystem/state.
- Temporary sandbox path: `.tmp-plan-tests` (auto-cleaned).

## Current Coverage

- `FOR_EACH` with embedded placeholders
- Deterministic `IF` logic
- Deterministic `WHILE` skip behavior
- Core state actions (`STATE_SET`, `STATE_APPEND`, `STATE_GET`, `STATE_CLEAR`)
