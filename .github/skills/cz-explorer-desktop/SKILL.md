---
name: cz-explorer-desktop
description: "Work in the cz-explorer-desktop Tauri 2 package. Use when: adding Tauri commands or events; modifying native/desktop capabilities; updating app permissions in tauri.conf.json; working on the Rust host side (src/lib.rs, src/main.rs); building or packaging the desktop app; debugging Tauri-specific issues like file system access, window management, or native MIDI."
---

# cz-explorer-desktop Package

Tauri 2 desktop wrapper around `cz-explorer`. Located at `packages/cz-explorer-desktop/`.

## Package Overview

| Path | Purpose |
|------|---------|
| `src/main.rs` | Tauri app entry point |
| `src/lib.rs` | Tauri commands and plugin registration |
| `tauri.conf.json` | App config: bundle ID, window settings, permissions |
| `capabilities/` | Tauri capability files (permission scopes) |
| `build.rs` | Build script (code gen) |
| `icons/` | App icons for all platforms |

## Development Workflow

### Running the Desktop App
```bash
bun run tauri dev    # Start with hot-reload (both Vite + Tauri)
bun run tauri build  # Production build + installer
```

### Adding a Tauri Command
1. Define Rust handler in `src/lib.rs`:
   ```rust
   #[tauri::command]
   fn my_command(arg: String) -> Result<String, String> { ... }
   ```
2. Register in the builder:
   ```rust
   .invoke_handler(tauri::generate_handler![my_command])
   ```
3. Call from frontend:
   ```ts
   import { invoke } from "@tauri-apps/api/core";
   const result = await invoke("my_command", { arg: "value" });
   ```

### Updating Capabilities / Permissions
- Capability files live in `capabilities/`
- Permissions are declared per-window and per-plugin
- After changes, rebuild: `bun run tauri dev`
- Refer to Tauri 2 docs for plugin permission names

### Adding a Plugin
1. Add to `Cargo.toml` dependencies
2. Register plugin in `src/lib.rs` builder `.plugin(...)`
3. Add required permissions in `capabilities/`

## Key Conventions
- Frontend code lives in `packages/cz-explorer/` — don't duplicate UI here
- Only put native-required logic (file system, OS APIs, native MIDI) in Tauri commands
- Tauri 2 uses capability-based permissions; never use `"all"` in production capabilities
- Window config (`tauri.conf.json`) controls initial size, title, decorations

## Commands
```bash
bun run tauri dev      # Development (Tauri + Vite)
bun run tauri build    # Production build
cargo build            # Rust-only build check (from this package dir)
cargo test             # Rust tests (from this package dir)
```

## Troubleshooting
- **White screen**: Vite dev server may not be ready; check that `devUrl` in `tauri.conf.json` matches the Vite port
- **Command not found**: Ensure command is registered in `generate_handler![]` macro
- **Permission denied**: Check `capabilities/` files; add required permission scope
- **Build fails on macOS**: Check `APPLE_SIGNING_IDENTITY` env var or disable code signing for dev
