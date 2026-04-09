# CZ101 Presets Library

A collection of presets for CZ101.

## Overview

This library provides a managed way to store, organize, and interact with presets for the CZ101 synthesizer. It leverages Tauri for a desktop application experience, React for the user interface, and Drizzle ORM for database management.

## Setup Instructions

### Prerequisites

- [Bun](https://bun.sh/)
- [Rust](https://www.rust-lang.org/tools/install)
- [Tauri CLI](https://tauri.app/v1/guides/getting-started/prerequisites/)

### Installation

1. Clone the repository.
2. Install dependencies using bun:
   ```bash
   bun install
   ```

### Development

- Start the development server:
  ```bash
  bun dev
  ```
- Run Tauri in development mode:
  ```bash
  bun tauri dev
  ```

## Features

- Preset management for CZ101.
- Desktop application via Tauri.
- Database integration with Drizzle ORM and Neon/Postgres.
- High-performance UI using React and Tailwind CSS.

## Architecture

### Frontend

- **React**: UI library.
- **Tailwind CSS**: Styling.
- **TanStack Query**: Data fetching and state management.
- **TanStack Table**: Data grid management.
- **Vite**: Build tool and dev server.

### Backend / Desktop

- **Tauri**: Provides the bridge between the web frontend and the native OS.
- **Rust**: Core logic for the desktop application.

### Database

- **Drizzle ORM**: Type-safe database access.
- **PostgreSQL**: Database backend (can be local or hosted via Neon).

## Development Tools

### Package Management

- **Bun**: Fast JavaScript runtime and package manager.

### Linting & Formatting

- **Biome**: Unified linter and formatter.

## Testing

This project uses **Vitest** for all testing needs, supporting multiple environments:

### Test Types

- **Unit Tests**: Fast, logic-focused tests running in a simulated DOM (Happy DOM).
- **Component Tests**: Testing UI components with React Testing Library.
- **Browser Tests**: High-fidelity UI tests running in a real browser via Playwright.

### Commands

- `bun run test`: Run all tests.
- `bun run test:unit`: Run unit tests.
- `bun run test:component`: Run component tests.
- `bun run test:browser`: Run browser-based tests.
- `bun run test:ui`: Launch Vitest UI for interactive testing.
- `bun run test:coverage`: Generate test coverage reports.

For detailed testing strategies and patterns, see [docs/component-testing.md](docs/component-testing.md).

### Commands

- `bun run test`: Run all tests.
- `bun run test:unit`: Run unit tests.
- `bun run test:component`: Run component tests.
- `bun run test:browser`: Run browser-based tests.
- `bun run test:ui`: Launch Vitest UI for interactive testing.
- `bun run test:coverage`: Generate test coverage reports.
- `bun dev`: Run Vite dev server.
- `bun build`: Build the application.
- `bun lint`: Run Biome check.
- `bun lint:fix`: Run Biome check and fix.
- `bun db:generate`: Generate Drizzle migrations.
- `bun db:migrate`: Run Drizzle migrations.
