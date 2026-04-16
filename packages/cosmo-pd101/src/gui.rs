//! GUI helpers for the Cosmo PD-101 plugin WebView.
//!
//! # Debugging the plugin UI
//!
//! ## Log file
//! All Rust-side events are written to `/tmp/cosmo-plugin.log`.
//! Tail it while the DAW is running:
//!
//! ```sh
//! tail -f /tmp/cosmo-plugin.log
//! ```
//!
//! ## Safari Web Inspector (WebKit DevTools)
//! Build with the `debug_gui` feature to enable the WebKit inspector:
//!
//! ```sh
//! cargo build -p cosmo-pd101 --features debug_gui
//! bun run plugin:build:debug   # uses debug profile + debug_gui
//! ```
//!
//! Then in Safari → Develop menu → find the plugin process → inspect the
//! WKWebView.  You get the full DevTools: console, network, sources, etc.
//!
//! ## Live UI reload (debug_gui only)
//! When built with `debug_gui` the WebView loads the UI from the repo's
//! `dist/` directory via a `file://` URL resolved relative to this crate's
//! `CARGO_MANIFEST_DIR` at compile time.  Run `bun run build` to rebuild the
//! UI; then close/re-open the plugin window in the DAW — no plugin rebuild
//! needed.
//!
//! ## Attaching lldb
//! Debug builds keep full DWARF symbols (`[profile.dev] debug = true`).
//! Find the DAW's PID and attach:
//!
//! ```sh
//! lldb -p $(pgrep -x "Logic Pro X")
//! ```

// ─── GUI size constraints ─────────────────────────────────────────────────────

pub const DEFAULT_WIDTH: u32 = 1280;
pub const DEFAULT_HEIGHT: u32 = 800;

pub const MIN_WIDTH: u32 = 400;
pub const MIN_HEIGHT: u32 = 300;
pub const MAX_WIDTH: u32 = 1600;
pub const MAX_HEIGHT: u32 = 900;

// ─── CzGui ────────────────────────────────────────────────────────────────────

/// Holds the per-instance GUI state: WebView handle, current logical size, and
/// the DPI scale factor last reported by the host.
pub struct CzGui {
    /// The wry WebView, present only after the view has been shown in a window.
    pub web_view: Option<wry::WebView>,
    /// Raw NSView pointer from the host, stored in `set_parent`, used in `show`.
    /// Stored as a raw pointer because `RawWindowHandle` is not Send/Sync.
    pub pending_ns_view: Option<*mut std::ffi::c_void>,
    /// Current logical size (in logical pixels) of the plugin window.
    pub size: wry::dpi::LogicalSize<f64>,
    /// Host-reported DPI scale factor (1.0 = 100 % / standard DPI).
    pub scale_factor: f64,
}

// SAFETY: The ns_view pointer is only accessed on the main thread (plugin main
// thread) and the DAW guarantees it stays valid between set_parent and destroy.
unsafe impl Send for CzGui {}
unsafe impl Sync for CzGui {}

impl CzGui {
    pub fn new() -> Self {
        Self {
            web_view: None,
            pending_ns_view: None,
            size: wry::dpi::LogicalSize {
                width: DEFAULT_WIDTH as f64,
                height: DEFAULT_HEIGHT as f64,
            },
            scale_factor: 1.0,
        }
    }
}

// ─── Plugin resource directory ────────────────────────────────────────────────

/// Returns the directory that contains the plugin's web UI assets (`plugin.html`,
/// `assets/`, etc.).
///
/// - **`debug_gui` feature**: `<repo_root>/dist/`
/// - **Release**: `<bundle>/Contents/Resources/ui/` (resolved via `dladdr`)
///
/// Used by the custom protocol handler (`cz://`) so that WKWebView can load
/// the React bundle without any `file://` cross-origin restrictions.
pub fn plugin_resource_dir() -> Option<std::path::PathBuf> {
    #[cfg(feature = "debug_gui")]
    {
        let manifest = env!("CARGO_MANIFEST_DIR");
        let repo_root = std::path::Path::new(manifest)
            .parent() // src-tauri/
            .and_then(|p| p.parent()) // repo root
            .map(|p| p.to_path_buf())
            .unwrap_or_else(|| std::path::PathBuf::from("."));
        let dir = repo_root.join("dist");
        crate::append_log(&format!("[debug_gui] resource_dir: {}", dir.display()));
        return Some(dir);
    }

    #[cfg(not(feature = "debug_gui"))]
    {
        if let Some(dylib) = dylib_path() {
            // dylib = .../Contents/MacOS/<binary>
            // ui dir = .../Contents/Resources/ui/
            let dir = dylib
                .parent() // MacOS/
                .and_then(|p| p.parent()) // Contents/
                .map(|p| p.join("Resources").join("ui"));
            if let Some(ref d) = dir {
                crate::append_log(&format!("[release] resource_dir: {}", d.display()));
                if d.exists() {
                    return dir;
                }
                crate::append_log(&format!(
                    "[release] WARNING: resource dir not found at {}",
                    d.display()
                ));
            }
        }
        crate::append_log("[release] WARNING: could not determine resource dir");
        None
    }
}

/// Returns the path to this dylib using `dladdr` on macOS.
#[cfg(not(feature = "debug_gui"))]
fn dylib_path() -> Option<std::path::PathBuf> {
    use std::ffi::CStr;

    #[repr(C)]
    struct DlInfo {
        dli_fname: *const libc::c_char,
        dli_fbase: *mut libc::c_void,
        dli_sname: *const libc::c_char,
        dli_saddr: *mut libc::c_void,
    }

    extern "C" {
        fn dladdr(addr: *const libc::c_void, info: *mut DlInfo) -> libc::c_int;
    }

    // Use the address of this function itself as the probe address.
    let probe = dylib_path as *const libc::c_void;
    let mut info = DlInfo {
        dli_fname: std::ptr::null(),
        dli_fbase: std::ptr::null_mut(),
        dli_sname: std::ptr::null(),
        dli_saddr: std::ptr::null_mut(),
    };
    let ret = unsafe { dladdr(probe, &mut info) };
    if ret == 0 || info.dli_fname.is_null() {
        return None;
    }
    let cstr = unsafe { CStr::from_ptr(info.dli_fname) };
    let s = cstr.to_str().ok()?;
    Some(std::path::PathBuf::from(s))
}

/// Returns `true` when the WebKit inspector should be enabled on the WebView.
/// Always `false` in release builds; always `true` with `debug_gui`.
#[allow(dead_code)]
pub fn inspector_enabled() -> bool {
    cfg!(feature = "debug_gui")
}
