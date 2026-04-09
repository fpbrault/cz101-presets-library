# Component Testing Strategy

This project supports reusable component tests with Vitest + Testing Library, including browser-based tests via Playwright.

## Current foundation

- `src/test/TestAppProviders.tsx`: wraps UI with Query + app contexts.
- `src/test/renderWithProviders.tsx`: one-call render helper for component tests.
- `setupTests.ts`: includes `@testing-library/jest-dom/vitest` matchers.

## Test Environments

### 1. Unit / DOM Testing (Happy DOM)

Used for most component tests and logic tests. It is extremely fast but does not represent a real browser environment.

### 2. Browser Testing (Playwright)

Used for high-fidelity UI tests that require a real browser environment. This is essential for testing complex interactions, CSS layouts, and browser-specific APIs.

## Commands

- `bun run test:component`: Run component tests in the DOM environment.
- `bun run test:browser`: Run browser-based tests using Playwright.
- `bun run test:ui`: Launch Vitest UI for interactive testing.

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
