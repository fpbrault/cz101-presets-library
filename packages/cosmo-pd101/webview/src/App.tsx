import { useEffect, useRef, useState } from "react";
import PluginPage from "@/features/plugin/PluginPage";
import "@/App.css";
import { ensureBeamerLegacyBridge } from "./beamerLegacyBridge";
import {
	checkForPluginUpdate,
	type PluginUpdateInfo,
} from "./update/checkPluginUpdate";

declare const __CZ_BUILD_LABEL__: string;

export default function App() {
	const bridgeReadyRef = useRef(false);
	const [updateInfo, setUpdateInfo] = useState<PluginUpdateInfo | null>(null);
	const [manualStatus, setManualStatus] = useState<string | null>(null);

	if (!bridgeReadyRef.current) {
		ensureBeamerLegacyBridge();
		bridgeReadyRef.current = true;
	}

	useEffect(() => {
		void (async () => {
			const info = await checkForPluginUpdate();
			setUpdateInfo(info);
		})();
	}, []);

	const handleManualCheck = () => {
		void (async () => {
			const info = await checkForPluginUpdate({ manual: true });
			if (info) {
				setManualStatus(null);
				setUpdateInfo(info);
				return;
			}
			setManualStatus("You are up to date.");
		})();
	};

	return (
		<>
			<PluginPage />
			<div className="fixed bottom-3 right-3 z-9500 flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/90 px-3 py-2 text-xs text-slate-200 shadow-xl backdrop-blur">
				<span className="font-mono">Build {__CZ_BUILD_LABEL__}</span>
				<button
					type="button"
					onClick={handleManualCheck}
					className="rounded border border-slate-600 px-2 py-1 text-xs text-slate-100 hover:bg-slate-800"
				>
					Check updates
				</button>
			</div>
			{manualStatus && (
				<div className="fixed bottom-14 right-3 z-9600 rounded-md border border-slate-700 bg-slate-900/95 px-3 py-2 text-xs text-slate-200 shadow-lg">
					{manualStatus}
				</div>
			)}
			{updateInfo && (
				<div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/65 p-4">
					<div className="w-full max-w-md rounded-xl border border-slate-700 bg-slate-900 p-5 text-slate-100 shadow-2xl">
						<h2 className="text-lg font-semibold">New Version Available</h2>
						<p className="mt-2 text-sm text-slate-300">
							Version v{updateInfo.latestVersion} is available (you are on
							 v{updateInfo.currentVersion}).
						</p>
						{updateInfo.forcedByEnv && (
							<p className="mt-1 text-xs text-amber-300">
								Test mode enabled via VITE_FORCE_UPDATE_NOTIFIER=1.
							</p>
						)}
						<p className="mt-1 text-xs text-slate-400">
							Open the GitHub release page to download the update.
						</p>
						<div className="mt-4 flex justify-end gap-2">
							<button
								type="button"
								onClick={() => {
									setUpdateInfo(null);
									setManualStatus(null);
								}}
								className="rounded-md border border-slate-600 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800"
							>
								Later
							</button>
							<a
								href={updateInfo.releaseUrl}
								target="_blank"
								rel="noreferrer"
								className="rounded-md bg-sky-500 px-3 py-2 text-sm font-medium text-white hover:bg-sky-400"
							>
								View Release
							</a>
						</div>
					</div>
				</div>
			)}
		</>
	);
}
