//! GUI — WebView-based editor for the Cosmo PD-101 plugin.
//!
//! Implements nih-plug's [`Editor`] trait, embedding a wry [`WebView`] as a
//! child of the host's parent window (NSView on macOS).
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
//! cargo build -p cosmo-pd101-plugin --features debug_gui
//! bun run plugin:build:debug
//! ```

use std::any::Any;
use std::sync::{Arc, Mutex, RwLock};

use nih_plug::prelude::*;
use wry::WebViewBuilder;

use crate::{
    append_log, handle_ipc_invoke, AlgoControlsState, CzParams, EnvelopeState, ModMatrixState,
    ScopeBuffer, UiInputQueue,
};

// ─── Size constants ──────────────────────────────────────────────────────────

pub const DEFAULT_WIDTH: u32 = 1280;
pub const DEFAULT_HEIGHT: u32 = 800;

// ─── WebViewContainer ────────────────────────────────────────────────────────

/// Holds the live WebView instance; cleared on Drop to destroy the view.
struct WebViewContainer {
    webview: Option<wry::WebView>,
}

// SAFETY: wry::WebView wraps a WKWebView that should only be accessed on the
// main thread.  In nih-plug, the GUI always runs on the main/UI thread, so
// we never move the WebView across threads in practice.
unsafe impl Send for WebViewContainer {}
unsafe impl Sync for WebViewContainer {}

// ─── CzEditorHandle ──────────────────────────────────────────────────────────

/// Returned from [`CzEditor::spawn`]; destroys the WebView when dropped.
struct CzEditorHandle {
    webview_state: Arc<Mutex<WebViewContainer>>,
}

impl Drop for CzEditorHandle {
    fn drop(&mut self) {
        if let Ok(mut c) = self.webview_state.lock() {
            c.webview = None;
        }
        append_log("CzEditorHandle dropped; WebView destroyed");
    }
}

// SAFETY: Same reasoning as WebViewContainer.
unsafe impl Send for CzEditorHandle {}

// ─── CzEditor ────────────────────────────────────────────────────────────────

/// nih-plug `Editor` implementation for the Cosmo PD-101 plugin.
pub struct CzEditor {
    params: Arc<CzParams>,
    envelopes: Arc<RwLock<EnvelopeState>>,
    algo_controls: Arc<RwLock<AlgoControlsState>>,
    mod_matrix: Arc<RwLock<ModMatrixState>>,
    scope_buffer: ScopeBuffer,
    _ui_input_queue: UiInputQueue,

    /// Shared handle to the live WebView (if any).  Held by both the Editor
    /// and the spawned handle so param pushes can reach the view.
    webview_state: Arc<Mutex<WebViewContainer>>,
}

impl CzEditor {
    pub(crate) fn new(
        params: Arc<CzParams>,
        envelopes: Arc<RwLock<EnvelopeState>>,
        algo_controls: Arc<RwLock<AlgoControlsState>>,
        mod_matrix: Arc<RwLock<ModMatrixState>>,
        scope_buffer: ScopeBuffer,
        ui_input_queue: UiInputQueue,
    ) -> Self {
        Self {
            params,
            envelopes,
            algo_controls,
            mod_matrix,
            scope_buffer,
            _ui_input_queue: ui_input_queue,
            webview_state: Arc::new(Mutex::new(WebViewContainer { webview: None })),
        }
    }

    /// Push the current parameter snapshot to the WebView's `__czOnParams` hook.
    fn push_params(&self) {
        let json = self.params.to_params_json().to_string();
        let script = format!(
            "if(typeof window.__czOnParams === 'function') {{ window.__czOnParams({json}); }}"
        );
        if let Ok(container) = self.webview_state.lock() {
            if let Some(wv) = &container.webview {
                let _ = wv.evaluate_script(&script);
            }
        }
    }
}

impl Editor for CzEditor {
    fn spawn(
        &self,
        parent: ParentWindowHandle,
        _context: Arc<dyn GuiContext>,
    ) -> Box<dyn Any + Send> {
        append_log("CzEditor::spawn");

        let ns_view = match parent {
            ParentWindowHandle::AppKitNsView(ptr) => ptr,
            other => {
                append_log(&format!(
                    "CzEditor::spawn: unsupported window handle: {other:?}"
                ));
                panic!("Cosmo PD-101 only supports macOS (AppKit) hosts");
            }
        };

        let resource_dir = plugin_resource_dir().expect("could not locate plugin resource dir");
        append_log(&format!("resource_dir: {}", resource_dir.display()));

        let envelopes = self.envelopes.clone();
        let algo_controls = self.algo_controls.clone();
        let mod_matrix = self.mod_matrix.clone();
        let scope_buffer = self.scope_buffer.clone();

        // IPC handler: JS → Rust
        let envelopes_ipc = envelopes.clone();
        let algo_controls_ipc = algo_controls.clone();
        let mod_matrix_ipc = mod_matrix.clone();
        let scope_buffer_ipc = scope_buffer.clone();

        let webview_state_for_ipc = self.webview_state.clone();

        let webview = unsafe {
            build_webview_from_ns_view(
                ns_view,
                resource_dir,
                envelopes_ipc,
                algo_controls_ipc,
                mod_matrix_ipc,
                scope_buffer_ipc,
                webview_state_for_ipc.clone(),
            )
        };

        if let Ok(mut container) = self.webview_state.lock() {
            container.webview = Some(webview);
        }

        // Push initial params to the freshly spawned webview
        self.push_params();

        Box::new(CzEditorHandle {
            webview_state: self.webview_state.clone(),
        })
    }

    fn size(&self) -> (u32, u32) {
        (DEFAULT_WIDTH, DEFAULT_HEIGHT)
    }

    fn set_scale_factor(&self, _factor: f32) -> bool {
        false
    }

    fn param_value_changed(&self, _id: &str, _normalized_value: f32) {
        self.push_params();
    }

    fn param_modulation_changed(&self, _id: &str, _modulation_offset: f32) {}

    fn param_values_changed(&self) {
        self.push_params();
    }
}

// ─── WebView builder ─────────────────────────────────────────────────────────

/// Build a [`wry::WebView`] embedded as a child of `ns_view`.
///
/// # Safety
/// `ns_view` must be a valid `NSView *` on the current macOS main thread, and
/// must remain valid for the lifetime of the returned WebView.
#[cfg(target_os = "macos")]
unsafe fn build_webview_from_ns_view(
    ns_view: *mut std::ffi::c_void,
    resource_dir: std::path::PathBuf,
    envelopes: Arc<RwLock<EnvelopeState>>,
    algo_controls: Arc<RwLock<AlgoControlsState>>,
    mod_matrix: Arc<RwLock<ModMatrixState>>,
    scope_buffer: ScopeBuffer,
    webview_state: Arc<Mutex<WebViewContainer>>,
) -> wry::WebView {
    use core::ptr::NonNull;
    use rwh_06::{
        AppKitDisplayHandle, AppKitWindowHandle, DisplayHandle, HandleError, HasDisplayHandle,
        HasWindowHandle, RawDisplayHandle, RawWindowHandle, WindowHandle,
    };
    use wry::dpi;

    // Wrapper that presents the host NSView as an rwh 0.6 window handle target
    // (wry 0.47 requires rwh 0.6 HasWindowHandle).
    struct NsViewWrapper(pub *mut std::ffi::c_void);
    impl HasWindowHandle for NsViewWrapper {
        fn window_handle(&self) -> Result<WindowHandle<'_>, HandleError> {
            let non_null = NonNull::new(self.0).expect("ns_view pointer is null");
            let handle = AppKitWindowHandle::new(non_null);
            Ok(unsafe { WindowHandle::borrow_raw(RawWindowHandle::AppKit(handle)) })
        }
    }
    impl HasDisplayHandle for NsViewWrapper {
        fn display_handle(&self) -> Result<DisplayHandle<'_>, HandleError> {
            let handle = AppKitDisplayHandle::new();
            Ok(unsafe { DisplayHandle::borrow_raw(RawDisplayHandle::AppKit(handle)) })
        }
    }
    // SAFETY: We only access the NsViewWrapper from the main thread in the plugin.
    unsafe impl Send for NsViewWrapper {}
    unsafe impl Sync for NsViewWrapper {}

    let parent = NsViewWrapper(ns_view);

    let webview_state_for_response = webview_state.clone();

    let webview = WebViewBuilder::new()
        .with_bounds(wry::Rect {
            position: dpi::LogicalPosition::new(0, 0).into(),
            size: dpi::LogicalSize::new(DEFAULT_WIDTH, DEFAULT_HEIGHT).into(),
        })
        .with_custom_protocol("cz".to_string(), move |_id, request| {
            serve_file(&resource_dir, request)
        })
        .with_ipc_handler(move |request| {
            let body = request.body();
            append_log(&format!("ipc raw: {body}"));

            // Parse as { id, method, args }
            if let Ok(msg) = serde_json::from_str::<serde_json::Value>(body) {
                let id = msg.get("id").cloned().unwrap_or(serde_json::Value::Null);
                let method = msg.get("method").and_then(|m| m.as_str()).unwrap_or("");
                let args = msg
                    .get("args")
                    .and_then(|a| a.as_array())
                    .cloned()
                    .unwrap_or_default();

                let result = handle_ipc_invoke(
                    method,
                    &args,
                    &envelopes,
                    &algo_controls,
                    &mod_matrix,
                    &scope_buffer,
                );

                let response = match result {
                    Ok(val) => serde_json::json!({ "id": id, "result": val }),
                    Err(e) => serde_json::json!({ "id": id, "error": e }),
                };

                let script = format!(
                    "window.__czIpcResponse && window.__czIpcResponse({})",
                    response
                );
                if let Ok(container) = webview_state_for_response.lock() {
                    if let Some(wv) = &container.webview {
                        let _ = wv.evaluate_script(&script);
                    }
                }
            }
        })
        .with_devtools(inspector_enabled())
        .with_url("cz://localhost/")
        .build_as_child(&parent)
        .expect("failed to create plugin WebView");

    webview
}

// ─── Protocol file server ────────────────────────────────────────────────────

fn serve_file(
    resource_dir: &std::path::Path,
    request: wry::http::Request<Vec<u8>>,
) -> wry::http::Response<std::borrow::Cow<'static, [u8]>> {
    use std::fs;
    use wry::http::Response;

    let path = request.uri().path();
    let rel = path.trim_start_matches('/');
    let file_path = if rel.is_empty() {
        resource_dir.join("index.html")
    } else {
        resource_dir.join(rel)
    };

    append_log(&format!("serve_file: {}", file_path.display()));

    match fs::read(&file_path) {
        Ok(data) => {
            let mime = mime_from_path(&file_path);
            Response::builder()
                .status(200)
                .header("Content-Type", mime)
                .body(std::borrow::Cow::Owned(data))
                .unwrap()
        }
        Err(e) => {
            append_log(&format!("serve_file 404: {} — {e}", file_path.display()));
            Response::builder()
                .status(404)
                .body(std::borrow::Cow::Owned(
                    format!("not found: {}", file_path.display()).into_bytes(),
                ))
                .unwrap()
        }
    }
}

fn mime_from_path(path: &std::path::Path) -> &'static str {
    match path.extension().and_then(|e| e.to_str()) {
        Some("html") => "text/html; charset=utf-8",
        Some("js") | Some("mjs") => "application/javascript",
        Some("css") => "text/css",
        Some("wasm") => "application/wasm",
        Some("json") => "application/json",
        Some("svg") => "image/svg+xml",
        Some("png") => "image/png",
        Some("ico") => "image/x-icon",
        _ => "application/octet-stream",
    }
}

// ─── Plugin resource directory ────────────────────────────────────────────────

/// Returns the directory that contains the plugin's web UI assets.
///
/// - **`debug_gui` feature**: `<repo_root>/dist/`
/// - **Release**: `<bundle>/Contents/Resources/ui/`
pub fn plugin_resource_dir() -> Option<std::path::PathBuf> {
    #[cfg(feature = "debug_gui")]
    {
        let manifest = env!("CARGO_MANIFEST_DIR");
        let repo_root = std::path::Path::new(manifest)
            .parent()
            .and_then(|p| p.parent())
            .map(|p| p.to_path_buf())
            .unwrap_or_else(|| std::path::PathBuf::from("."));
        let dir = repo_root.join("dist");
        append_log(&format!("[debug_gui] resource_dir: {}", dir.display()));
        return Some(dir);
    }

    #[cfg(not(feature = "debug_gui"))]
    {
        if let Some(dylib) = dylib_path() {
            let dir = dylib
                .parent()
                .and_then(|p| p.parent())
                .map(|p| p.join("Resources").join("ui"));
            if let Some(ref d) = dir {
                append_log(&format!("[release] resource_dir: {}", d.display()));
                if d.exists() {
                    return dir;
                }
                append_log(&format!(
                    "[release] WARNING: resource dir not found at {}",
                    d.display()
                ));
            }
        }
        append_log("[release] WARNING: could not determine resource dir");
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

/// Returns `true` when the WebKit inspector should be enabled.
#[allow(dead_code)]
pub fn inspector_enabled() -> bool {
    cfg!(feature = "debug_gui")
}
