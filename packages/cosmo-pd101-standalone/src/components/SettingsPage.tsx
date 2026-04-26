import { getCurrentWindow } from "@tauri-apps/api/window";
import SettingsMenu from "./SettingsMenu";

/**
 * Full-page settings UI rendered inside the native settings popup window
 * (`open_settings_window` Tauri command). Audio devices are populated from
 * the OS via cpal (enumerate_audio_devices Tauri command).
 */
export default function SettingsPage() {
	async function handleClose() {
		await getCurrentWindow().close();
	}

	return (
		<div className="min-h-screen bg-slate-900 flex flex-col">
			<div className="flex items-center justify-between px-4 py-3 border-b border-slate-700 shrink-0">
				<h1 className="text-sm font-semibold text-slate-200">
					Audio &amp; MIDI Settings
				</h1>
				<button
					type="button"
					onClick={() => void handleClose()}
					className="btn btn-xs btn-ghost text-slate-400 hover:text-slate-200"
					aria-label="Close settings"
				>
					✕
				</button>
			</div>
			<div className="flex-1 overflow-y-auto p-4">
				<SettingsMenu onClose={() => void handleClose()} />
			</div>
		</div>
	);
}
