pub mod audio;

use tauri::Manager;

/// Open (or focus) the audio/MIDI settings window.
/// The settings window renders `index.html?page=settings` — a separate
/// native OS window backed by the same webview app shell.
#[tauri::command]
async fn open_settings_window(app: tauri::AppHandle) -> Result<(), String> {
	// Re-focus if already open instead of opening a second copy.
	if let Some(existing) = app.get_webview_window("settings") {
		existing.set_focus().map_err(|e| e.to_string())?;
		return Ok(());
	}

	tauri::WebviewWindowBuilder::new(
		&app,
		"settings",
		tauri::WebviewUrl::App("index.html?page=settings".into()),
	)
	.title("Audio & MIDI Settings")
	.inner_size(480.0, 560.0)
	.resizable(false)
	.build()
	.map_err(|e| e.to_string())?;

	Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
	tauri::Builder::default()
		.plugin(tauri_plugin_midi::init())
		.invoke_handler(tauri::generate_handler![
			audio::enumerate_audio_devices,
			audio::enumerate_audio_hosts,
			audio::get_audio_settings,
			audio::update_audio_setting,
			open_settings_window,
		])
		.run(tauri::generate_context!())
		.expect("error while running tauri application");
}
