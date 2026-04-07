# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Commands
- `npm run dev`: Start the development server (Vite)
- `npm run build`: Build the application (TypeScript check + Vite build)
- `npm run tauri`: Run the application using Tauri
- `npm run preview`: Preview the production build locally

### Database (Drizzle ORM)
- `npm run db:generate`: Generate migration files from the schema
- `npm run db:migrate`: Run pending migrations against the database
- `npm run db:studio`: Launch Drizzle Studio to inspect the database

### Testing
The project uses Vitest with multiple configurations (unit and browser).
- `npm run test:unit`: Run unit tests (using happy-dom)
- `npm run test:browser`: Run browser-based tests (using Playwright/Vitest Browser mode)
- `npm run test:all`: Run all available tests
- `npm run test:component`: Run tests specifically for components and features
- `npm run test:ui`: Launch the Vitest UI for interactive testing
- `npm run test:coverage`: Generate test coverage reports for unit tests

## Codebase Architecture

### Overview
This is a Tauri-based desktop application built with React, TypeScript, and Vite. It manages a library of synthesizer presets and setlists, with support for both local (browser/indexedDB) and remote (Postgres via Drizzle) storage.

### High-Level Structure
- `src/components/`: Reusable UI components (buttons, inputs, modals, etc.).
- `src/features/`: Feature-specific logic and components:
    - `presets/`: Logic for managing, duplicating, and tagging presets.
    - `setlists/`: Logic for creating and managing setlists of presets.
    - `synthBackups/`: Logic for managing system-wide synth backups.
- `src/lib/`: Core business logic, utility functions, and data access layers:
    - Database adapters (Postgres, Browser/IndexedDB, and mock implementations for testing).
    - Synchronization logic (Preset and Auth sync).
    - MIDI handling and decoding (Sysex decoding).
- `src/db/`: Drizzle ORM schema definitions.
- `src/hooks/`: Custom React hooks for shared functionality (e.g., MIDI setup, drag-and-drop).
- `src/context/`: React Context providers for global state (MIDI ports, MIDI channels, Search filters).

### Data Layer
The application uses a multi-layered data strategy:
1. **Local Storage**: Uses Browser/IndexedDB for immediate, offline-capable access.
2. **Remote Storage**: Uses PostgreSQL (via Drizzle ORM) for persistent, cross-device synchronization.
3. **Sync Engine**: Handles the reconciliation between local state and the remote database.
