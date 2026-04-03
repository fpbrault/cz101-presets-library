# Component Testing Strategy

This project now supports reusable component tests with Vitest + Testing Library.

## Current foundation

- `src/test/TestAppProviders.tsx`: wraps UI with Query + app contexts.
- `src/test/renderWithProviders.tsx`: one-call render helper for component tests.
- `setupTests.ts`: includes `@testing-library/jest-dom/vitest` matchers.

## Commands

- `bun run test:component` for focused component test runs
- `bun run test:component:watch` for local TDD loops

## How to write a component test

1. Place tests near the component as `*.test.tsx`.
2. Use `renderWithProviders` for components that rely on context/providers.
3. Prefer user-facing queries and interactions (`screen`, `userEvent`).
4. Add stable `data-testid` attributes only where semantic queries are impractical (e.g., repeated controls).

## Playwright readiness

To keep Playwright component/e2e tests easy to add later:

1. Keep important controls discoverable by role/text first.
2. Add `data-testid` for repeated or highly dynamic controls.
3. Avoid coupling tests to implementation details like class names.
4. Keep modals and tables as isolated, composable components.

## Suggested next step

- Add Playwright config and first UI smoke test once feature slices settle.
