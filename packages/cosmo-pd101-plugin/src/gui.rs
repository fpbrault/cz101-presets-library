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

#![cfg_attr(target_os = "macos", allow(deprecated, unexpected_cfgs))]

use std::any::Any;
use std::panic::{self, AssertUnwindSafe};
use std::sync::{
    atomic::{AtomicBool, Ordering},
    Arc, Mutex, RwLock,
};

use nih_plug::prelude::*;
use wry::WebViewBuilder;

#[cfg(target_os = "macos")]
use cocoa;
#[cfg(target_os = "macos")]
use objc;

use crate::{
    append_log, handle_ipc_direct_format, handle_ipc_invoke, AlgoControlsState, CzParams,
    EnvelopeState, ModMatrixState, ScopeBuffer, UiInputQueue,
};

// ─── Size constants ──────────────────────────────────────────────────────────

pub const DEFAULT_WIDTH: u32 = 1280;
pub const DEFAULT_HEIGHT: u32 = 800;

// ─── Per-format URL scheme ───────────────────────────────────────────────────

/// Custom URL scheme used by this binary's WKWebView. Each plugin format
/// (VST3, CLAP, AUv2) is compiled with a distinct WRY_CUSTOM_SCHEME value so
/// that loading two different formats in the same host process does not cause
/// a WKWebView scheme-handler registration collision (the second format would
/// otherwise load `about:blank` because its scheme is already claimed by the
/// first format's loaded dylib).
///
/// Set via the `WRY_CUSTOM_SCHEME` environment variable at `cargo build` time.
/// Falls back to `"cz"` for plain `cargo check` / development builds.
const WEBVIEW_SCHEME: &str = match option_env!("WRY_CUSTOM_SCHEME") {
    Some(s) => s,
    None => "cz",
};

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
///
/// `_temp_window` holds an optional offscreen NSWindow created to satisfy
/// wry's `ns_view.window().unwrap()` call during `build_as_child`. It is
/// returned from `build_webview_from_ns_view` and stored here so it is dropped
/// AFTER the WebView is destroyed (webview_state cleared in Drop). By then the
/// host has moved ns_view into its own window, so the temp window's content
/// view has zero subviews and close() completes instantly.
struct CzEditorHandle {
    webview_state: Arc<Mutex<WebViewContainer>>,
    #[cfg(target_os = "macos")]
    _temp_window: Option<TempWindow>,
}

impl Drop for CzEditorHandle {
    fn drop(&mut self) {
        // Destroy the WebView FIRST, then _temp_window drops automatically.
        // On macOS, WKWebView teardown must happen on the main thread.
        if let Ok(mut c) = self.webview_state.lock() {
            #[cfg(target_os = "macos")]
            {
                if !is_main_thread() {
                    if let Some(wv) = c.webview.take() {
                        // Avoid crashing in hosts that drop editor handles from a
                        // non-main thread during processing.
                        std::mem::forget(wv);
                        append_log(
                            "CzEditorHandle dropped off main thread; leaked WebView to avoid crash",
                        );
                    }
                } else {
                    c.webview = None;
                    append_log("CzEditorHandle dropped; WebView destroyed on main thread");
                }
            }

            #[cfg(not(target_os = "macos"))]
            {
                c.webview = None;
                append_log("CzEditorHandle dropped; WebView destroyed");
            }
        }
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
            "if(typeof window.__czOnParams === 'function') {{ window.__czOnParams(JSON.stringify({json})); }}"
        );
        if let Ok(container) = self.webview_state.lock() {
            if let Some(wv) = &container.webview {
                let _ = wv.evaluate_script(&script);
            }
        }
    }
}

fn panic_payload_message(payload: Box<dyn Any + Send>) -> String {
    if let Some(message) = payload.downcast_ref::<&str>() {
        return (*message).to_string();
    }

    if let Some(message) = payload.downcast_ref::<String>() {
        return message.clone();
    }

    "unknown panic payload".to_string()
}

impl Editor for CzEditor {
    fn spawn(
        &self,
        parent: ParentWindowHandle,
        context: Arc<dyn GuiContext>,
    ) -> Box<dyn Any + Send> {
        append_log("CzEditor::spawn");

        let fallback_handle = || {
            Box::new(CzEditorHandle {
                webview_state: self.webview_state.clone(),
                #[cfg(target_os = "macos")]
                _temp_window: None,
            }) as Box<dyn Any + Send>
        };

        let spawn_result = panic::catch_unwind(AssertUnwindSafe(|| {
            #[cfg(target_os = "macos")]
            if !is_main_thread() {
                append_log(
                    "CzEditor::spawn called off main thread; skipping WebView creation to avoid Cocoa crash",
                );
                return fallback_handle();
            }

            let ns_view = match parent {
                ParentWindowHandle::AppKitNsView(ptr) => ptr,
                other => {
                    append_log(&format!(
                        "CzEditor::spawn: unsupported window handle: {other:?}"
                    ));
                    return fallback_handle();
                }
            };

            let Some(resource_dir) = plugin_resource_dir() else {
                append_log("CzEditor::spawn: resource dir unavailable; skipping WebView creation");
                return fallback_handle();
            };
            append_log(&format!("resource_dir: {}", resource_dir.display()));

            let envelopes = self.envelopes.clone();
            let algo_controls = self.algo_controls.clone();
            let mod_matrix = self.mod_matrix.clone();
            let scope_buffer = self.scope_buffer.clone();
            let params = self.params.clone();

            let envelopes_ipc = envelopes.clone();
            let algo_controls_ipc = algo_controls.clone();
            let mod_matrix_ipc = mod_matrix.clone();
            let scope_buffer_ipc = scope_buffer.clone();

            let webview_state_for_ipc = self.webview_state.clone();

            let (webview, temp_window) = unsafe {
                build_webview_from_ns_view(
                    ns_view,
                    resource_dir,
                    params,
                    envelopes_ipc,
                    algo_controls_ipc,
                    mod_matrix_ipc,
                    scope_buffer_ipc,
                    context.clone(),
                    webview_state_for_ipc.clone(),
                )
            };

            if let Ok(mut container) = self.webview_state.lock() {
                container.webview = webview;
            }

            self.push_params();

            Box::new(CzEditorHandle {
                webview_state: self.webview_state.clone(),
                #[cfg(target_os = "macos")]
                _temp_window: temp_window,
            }) as Box<dyn Any + Send>
        }));

        match spawn_result {
            Ok(handle) => handle,
            Err(payload) => {
                append_log(&format!(
                    "CzEditor::spawn panicked; returning no-op editor handle: {}",
                    panic_payload_message(payload)
                ));
                fallback_handle()
            }
        }
    }

    fn size(&self) -> (u32, u32) {
        (DEFAULT_WIDTH, DEFAULT_HEIGHT)
    }

    fn set_scale_factor(&self, _factor: f32) -> bool {
        false
    }

    fn param_value_changed(&self, _id: &str, _normalized_value: f32) {
        // Avoid touching WebKit from parameter callbacks: hosts may call these
        // while processing and not on the main thread.
    }

    fn param_modulation_changed(&self, _id: &str, _modulation_offset: f32) {}

    fn param_values_changed(&self) {
        // Avoid touching WebKit from parameter callbacks: hosts may call these
        // while processing and not on the main thread.
    }
}

// ─── Temporary NSWindow helper ───────────────────────────────────────────────

/// Offscreen NSWindow that gives an unparented NSView a window so that
/// wry 0.47's `ns_view.window().unwrap()` succeeds during `build_as_child`.
///
/// The TempWindow is returned to the caller (spawn) and stored in
/// CzEditorHandle. It is dropped AFTER the WebView is destroyed so that
/// WKWebView's internal cleanup does not hang waiting for window-association
/// work. By then ns_view has been reparented into the host's real window, so
/// the temp window's content view has zero subviews and close() is instant.
#[cfg(target_os = "macos")]
struct TempWindow {
    window: cocoa::base::id, // NSWindow *
}

#[cfg(target_os = "macos")]
impl Drop for TempWindow {
    fn drop(&mut self) {
        use objc::{msg_send, sel, sel_impl};
        append_log("[TempWindow] drop: starting");

        if !is_main_thread() {
            append_log(
                "[TempWindow] drop off main thread; leaking temporary NSWindow to avoid crash",
            );
            return;
        }

        unsafe {
            let content: cocoa::base::id = msg_send![self.window, contentView];
            let subviews: cocoa::base::id = msg_send![content, subviews];
            let count: usize = msg_send![subviews, count];
            append_log(&format!("[TempWindow] drop: {count} subviews"));
            // Don't manually removeFromSuperview — the host already moved ns_view
            // to its own window via addSubview:, which auto-removes from us.
            // Just close and release the now-empty temp window.
            let () = msg_send![self.window, close];
        }
        append_log("[TempWindow] temporary offscreen NSWindow released");
    }
}

// SAFETY: TempWindow wraps a raw ObjC pointer; we only touch it on the main thread.
#[cfg(target_os = "macos")]
unsafe impl Send for TempWindow {}

#[cfg(target_os = "macos")]
fn is_main_thread() -> bool {
    use objc::{class, msg_send, sel, sel_impl};

    unsafe {
        let thread_class = class!(NSThread);
        let is_main: bool = msg_send![thread_class, isMainThread];
        is_main
    }
}

#[cfg(target_os = "macos")]
unsafe fn parent_has_window(ns_view: *mut std::ffi::c_void) -> bool {
    use cocoa::base::{id, nil};
    use objc::{msg_send, sel, sel_impl};

    let ns_view = ns_view as id;
    let existing_window: id = msg_send![ns_view, window];
    existing_window != nil
}

#[cfg(target_os = "macos")]
unsafe fn wait_for_parent_window(
    ns_view: *mut std::ffi::c_void,
    timeout: std::time::Duration,
) -> bool {
    use objc::{class, msg_send, sel, sel_impl};

    let deadline = std::time::Instant::now() + timeout;
    let run_loop: cocoa::base::id = msg_send![class!(NSRunLoop), currentRunLoop];

    while std::time::Instant::now() < deadline {
        if parent_has_window(ns_view) {
            return true;
        }

        let until: cocoa::base::id =
            msg_send![class!(NSDate), dateWithTimeIntervalSinceNow: 0.01_f64];
        let _: () = msg_send![run_loop, runUntilDate: until];
    }

    parent_has_window(ns_view)
}

/// If `ns_view` has no window, create an offscreen NSWindow, attach the view,
/// and return a `TempWindow` guard. Returns `None` if view already has a window.
#[cfg(target_os = "macos")]
unsafe fn ensure_parent_has_window(ns_view: *mut std::ffi::c_void) -> Option<TempWindow> {
    use cocoa::base::{id, nil};
    use cocoa::foundation::{NSPoint, NSRect, NSSize};
    use objc::{class, msg_send, sel, sel_impl};

    if wait_for_parent_window(ns_view, std::time::Duration::from_millis(250)) {
        append_log("[TempWindow] parent NSView gained a real window during startup wait");
        return None;
    }

    let ns_view = ns_view as id;
    let existing_window: id = msg_send![ns_view, window];
    if existing_window != nil {
        return None;
    }

    append_log("[TempWindow] parent NSView still has no window after startup wait — creating temporary offscreen NSWindow");

    const NS_BORDERLESS_WINDOW_MASK: usize = 0;
    const NS_BACKING_STORE_BUFFERED: usize = 2;

    let frame = NSRect {
        origin: NSPoint {
            x: -100_000.0,
            y: -100_000.0,
        },
        size: NSSize {
            width: DEFAULT_WIDTH as f64,
            height: DEFAULT_HEIGHT as f64,
        },
    };

    let window_cls = class!(NSWindow);
    let window: id = msg_send![window_cls, alloc];
    let window: id = msg_send![
        window,
        initWithContentRect: frame
        styleMask:         NS_BORDERLESS_WINDOW_MASK
        backing:           NS_BACKING_STORE_BUFFERED
        defer:             cocoa::base::YES
    ];

    if window == nil {
        append_log("[TempWindow] ERROR: failed to create temporary NSWindow");
        return None;
    }

    let content_view: id = msg_send![window, contentView];
    let (): () = msg_send![content_view, addSubview: ns_view];

    Some(TempWindow { window })
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
    params: Arc<CzParams>,
    envelopes: Arc<RwLock<EnvelopeState>>,
    algo_controls: Arc<RwLock<AlgoControlsState>>,
    mod_matrix: Arc<RwLock<ModMatrixState>>,
    scope_buffer: ScopeBuffer,
    gui_context: Arc<dyn GuiContext>,
    webview_state: Arc<Mutex<WebViewContainer>>,
) -> (Option<wry::WebView>, Option<TempWindow>) {
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

    // wry 0.47 calls ns_view.window().unwrap() unconditionally to get the
    // backing scale factor. Some AU hosts (pluginval) haven't inserted ns_view
    // into a window yet. Attach it to an offscreen NSWindow temporarily.
    // The TempWindow is returned to spawn() to be stored in CzEditorHandle —
    // it is dropped AFTER the WebView is destroyed (see CzEditorHandle docs).
    let temp_window = ensure_parent_has_window(ns_view);

    let webview_state_for_response = webview_state.clone();
    let params_repush_done = Arc::new(AtomicBool::new(false));

    let webview = WebViewBuilder::new()
        .with_bounds(wry::Rect {
            position: dpi::LogicalPosition::new(0, 0).into(),
            size: dpi::LogicalSize::new(DEFAULT_WIDTH, DEFAULT_HEIGHT).into(),
        })
        .with_custom_protocol(WEBVIEW_SCHEME.to_string(), move |_id, request| {
            serve_file(&resource_dir, request)
        })
        .with_ipc_handler(move |request| {
            let body = request.body();
            let params_repush_done = params_repush_done.clone();

            // Parse as { id, method, args }
            if let Ok(msg) = serde_json::from_str::<serde_json::Value>(body) {
                // Webview param bridge sends direct { param_id, value } updates.
                if let (Some(param_id), Some(value)) = (
                    msg.get("param_id").and_then(serde_json::Value::as_str),
                    msg.get("value").and_then(serde_json::Value::as_f64),
                ) {
                    let setter = ParamSetter::new(gui_context.as_ref());
                    if !params.set_from_webview(&setter, param_id, value as f32) {
                        append_log(&format!(
                            "ipc unknown param_id from webview: {param_id}"
                        ));
                    }
                    return;
                }

                // wry exposes window.ipc as non-configurable+frozen so the
                // nihPlugBridge shim cannot be installed. The cosmo-pd101
                // library therefore sends algo-controls, mod-matrix and
                // envelope updates in their original direct-object form
                // (no { id, method, args } wrapper). Handle those here.
                if handle_ipc_direct_format(
                    &msg,
                    &envelopes,
                    &algo_controls,
                    &mod_matrix,
                ) {
                    return;
                }

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

                        // Re-push params once from the UI thread after the first
                        // inbound IPC message to avoid startup races without flooding.
                        if params_repush_done
                            .compare_exchange(false, true, Ordering::AcqRel, Ordering::Acquire)
                            .is_ok()
                        {
                            let json = params.to_params_json().to_string();
                            let params_script = format!(
                                "if(typeof window.__czOnParams === 'function') {{ window.__czOnParams(JSON.stringify({json})); }}"
                            );
                            let _ = wv.evaluate_script(&params_script);
                        }
                    }
                }
            }
        })
        .with_devtools(inspector_enabled())
        .with_url(&format!("{}://localhost/", WEBVIEW_SCHEME))
        .build_as_child(&parent);

    match webview {
        Ok(webview) => {
            append_log("build_as_child returned — WebView created");
            (Some(webview), temp_window)
        }
        Err(e) => {
            append_log(&format!("failed to create plugin WebView: {e}"));
            (None, temp_window)
        }
    }
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
