import { useQueryClient } from "@tanstack/react-query";
import { save } from "@tauri-apps/plugin-dialog";
import { writeTextFile } from "@tauri-apps/plugin-fs";
import type React from "react";
import { useState } from "react";
import {
	FaApple,
	FaCloudUploadAlt,
	FaCog,
	FaGoogle,
	FaSignInAlt,
} from "react-icons/fa";
import FileInput from "@/components/forms/FileInput";
import Button from "@/components/ui/Button";
import { useToast } from "@/context/ToastContext";
import {
	disconnectOnlineSession,
	loadOnlineAuthSession,
	refreshOnlineAuthSession,
	startOnlineProviderSignIn,
} from "@/lib/auth/onlineAuthSession";
import {
	exportWorkspaceBackup,
	importWorkspaceBackup,
	isWorkspaceBackupEnvelope,
} from "@/lib/backup/workspaceBackup";
import {
	addFactoryPresetsToLibrary,
	clearCloudPresetBackup,
	cloudBackupPresets,
	cloudRestorePresets,
	exportPresets,
	importPresets,
	resetLocalAppData,
} from "@/lib/presets/presetManager";
import {
	loadOnlineSyncSettings,
	saveOnlineSyncSettings,
} from "@/lib/sync/onlineSyncSettings";
import { configurePresetSyncAdapterFromSettings } from "@/lib/sync/remotePresetSyncAdapter";

interface SettingsPanelProps {
	triggerType?: "settings" | "login";
	iconOnly?: boolean;
	minimalTrigger?: boolean;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({
	triggerType = "settings",
	iconOnly = false,
	minimalTrigger = false,
}) => {
	const queryClient = useQueryClient();
	const { notifySuccess, notifyInfo, notifyError } = useToast();
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [isResetModalOpen, setIsResetModalOpen] = useState(false);
	const [resetCloudToo, setResetCloudToo] = useState(false);
	const [isResetting, setIsResetting] = useState(false);
	const [onlineSyncSettings, setOnlineSyncSettings] = useState(
		loadOnlineSyncSettings(),
	);
	const [onlineAuthSession, setOnlineAuthSession] = useState(
		loadOnlineAuthSession(),
	);
	const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);

	const applySyncModeFromSession = (session: { userId: string } | null) => {
		const nextSettings = { enabled: Boolean(session?.userId) };
		saveOnlineSyncSettings(nextSettings);
		setOnlineSyncSettings(nextSettings);
		configurePresetSyncAdapterFromSettings();
	};

	const handleOpenModal = () => {
		const loaded = loadOnlineSyncSettings();
		const loadedSession = loadOnlineAuthSession();
		setOnlineSyncSettings(loaded);
		setOnlineAuthSession(loadedSession);
		setAvatarLoadFailed(false);
		setIsModalOpen(true);

		void (async () => {
			const nextSession = await refreshOnlineAuthSession();
			setOnlineAuthSession(nextSession);
			setAvatarLoadFailed(false);
			applySyncModeFromSession(nextSession);
		})();
	};
	const handleCloseModal = () => setIsModalOpen(false);

	const handleExport = async () => {
		const data = await exportPresets();
		if ("__TAURI__" in window) {
			// Tauri environment
			const filePath = await save({
				filters: [
					{
						name: "JSON",
						extensions: ["json"],
					},
				],
			});
			if (filePath) {
				await writeTextFile(filePath, data);
				notifySuccess("Preset export completed.");
			}
		} else {
			// Browser environment
			const blob = new Blob([data], { type: "application/json" });
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = "presets.json";
			a.click();
			URL.revokeObjectURL(url);
			notifySuccess("Preset export completed.");
		}
	};

	const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		if (file) {
			const data = await file.text();
			try {
				const parsed = JSON.parse(data);
				if (isWorkspaceBackupEnvelope(parsed)) {
					await importWorkspaceBackup(data);
				} else {
					await importPresets(data);
				}
			} catch (error) {
				console.error("Failed to import JSON file:", error);
				notifyError("Import failed. Invalid JSON data.");
				return;
			}
			handleCloseModal();
			await queryClient.invalidateQueries({ queryKey: ["presets"] });
			notifySuccess("Import completed.");
		}
	};

	const handleExportWorkspace = async () => {
		const data = await exportWorkspaceBackup();
		if ("__TAURI__" in window) {
			const filePath = await save({
				filters: [
					{
						name: "JSON",
						extensions: ["json"],
					},
				],
			});
			if (filePath) {
				await writeTextFile(filePath, data);
				notifySuccess("Workspace backup exported.");
			}
		} else {
			const blob = new Blob([data], { type: "application/json" });
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = "workspace-backup.json";
			a.click();
			URL.revokeObjectURL(url);
			notifySuccess("Workspace backup exported.");
		}
	};

	const handleAddFactoryPresets = () => {
		void (async () => {
			try {
				const addedCount = await addFactoryPresetsToLibrary();
				await queryClient.invalidateQueries({ queryKey: ["presets"] });
				if (addedCount > 0) {
					notifySuccess(`Added ${addedCount} factory preset(s).`);
				} else {
					notifyInfo("Factory presets are already in your library.");
				}
			} catch (error) {
				notifyError((error as Error).message);
			}
		})();
	};

	const handleBackupNow = () => {
		void (async () => {
			try {
				const ok = await cloudBackupPresets();
				if (ok) {
					notifySuccess("Backup saved to cloud.");
				} else {
					notifyError("Backup failed. Check connection and sync availability.");
				}
			} catch (error) {
				notifyError((error as Error).message);
			}
		})();
	};

	const handleRestoreFromBackup = () => {
		void (async () => {
			try {
				const count = await cloudRestorePresets();
				if (count === null) {
					notifyInfo("No backup found in the cloud.");
				} else {
					await queryClient.invalidateQueries({ queryKey: ["presets"] });
					notifySuccess(`Restored ${count} user preset(s) from cloud backup.`);
				}
			} catch (error) {
				notifyError((error as Error).message);
			}
		})();
	};

	const handleOpenResetModal = () => {
		setResetCloudToo(false);
		setIsResetModalOpen(true);
	};

	const handleCloseResetModal = () => {
		if (!isResetting) {
			setIsResetModalOpen(false);
		}
	};

	const handleConfirmResetData = () => {
		void (async () => {
			setIsResetting(true);
			try {
				await resetLocalAppData();
				await queryClient.invalidateQueries({ queryKey: ["presets"] });

				if (!resetCloudToo) {
					notifySuccess("Local data reset complete.");
					setIsResetModalOpen(false);
					return;
				}

				const cloudCleared = await clearCloudPresetBackup();
				if (cloudCleared) {
					notifySuccess("Local data reset and cloud backup cleared.");
				} else {
					notifyInfo(
						"Local data reset complete. Cloud backup was not cleared (sync disabled or unavailable).",
					);
				}
				setIsResetModalOpen(false);
			} catch (error) {
				notifyError((error as Error).message);
			} finally {
				setIsResetting(false);
			}
		})();
	};

	const handleSignIn = (provider: "google" | "apple") => {
		void (async () => {
			try {
				await startOnlineProviderSignIn(provider);
				// Popup closed — refresh session and update sync state
				const session = await refreshOnlineAuthSession();
				setOnlineAuthSession(session);
				setAvatarLoadFailed(false);
				applySyncModeFromSession(session);
				if (session) {
					notifySuccess(
						`Signed in as ${session.displayName || session.userId}`,
					);
				}
			} catch (error) {
				notifyError((error as Error).message);
			}
		})();
	};

	const handleDisconnectAccount = () => {
		void (async () => {
			await disconnectOnlineSession();
			setOnlineAuthSession(null);
			setAvatarLoadFailed(false);
			applySyncModeFromSession(null);
			notifyInfo("Disconnected account. Local-only mode enabled.");
		})();
	};

	const renderAccountTriggerIcon = () => {
		if (onlineAuthSession?.avatarUrl && !avatarLoadFailed) {
			return (
				<img
					src={onlineAuthSession.avatarUrl}
					alt={onlineAuthSession.displayName || "Account"}
					className="size-5 rounded-full object-cover"
					onError={() => setAvatarLoadFailed(true)}
					referrerPolicy="no-referrer"
				/>
			);
		}

		if (onlineAuthSession) {
			const accountLabel =
				onlineAuthSession.displayName || onlineAuthSession.userId;
			const generatedAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(
				accountLabel,
			)}&background=3b2f68&color=f4dd8c&size=64&rounded=true`;
			return (
				<img
					src={generatedAvatar}
					alt={accountLabel}
					className="size-5 rounded-full object-cover"
					referrerPolicy="no-referrer"
				/>
			);
		}

		return <FaSignInAlt size={14} />;
	};

	return (
		<>
			{/* Sidebar icon-only style without button chrome */}
			{minimalTrigger ? (
				<Button
					type="button"
					unstyled
					onClick={handleOpenModal}
					title={
						triggerType === "login"
							? onlineAuthSession
								? "Account"
								: "Login / Connect Account"
							: "Settings"
					}
					className={
						"grid size-9 place-items-center text-base-content/55 transition-colors hover:text-warning " +
						(triggerType === "login" && onlineAuthSession ? "text-warning" : "")
					}
				>
					{triggerType === "login" ? (
						renderAccountTriggerIcon()
					) : (
						<FaCog size={16} />
					)}
				</Button>
			) : triggerType === "login" ? (
				<Button
					onClick={handleOpenModal}
					variant={onlineAuthSession ? "accent" : "secondary"}
					size={iconOnly ? "md" : "sm"}
					title={onlineAuthSession ? "Account" : "Login / Connect Account"}
					className={iconOnly ? "px-0 w-10 min-w-10" : "gap-2"}
				>
					{renderAccountTriggerIcon()}
					{!iconOnly && (onlineAuthSession ? "Account" : "Login")}
				</Button>
			) : (
				<Button
					onClick={handleOpenModal}
					variant="secondary"
					size={iconOnly ? "md" : "sm"}
					title="Settings"
					className={iconOnly ? "px-0 w-10 min-w-10" : "gap-2"}
				>
					<FaCog size={14} />
					{!iconOnly && "Settings"}
				</Button>
			)}

			{isModalOpen && (
				<dialog open className="modal modal-open">
					<div className="modal-box w-[min(96vw,840px)] max-w-none max-h-[90vh] overflow-y-auto p-6 shadow-xl bg-base-100 rounded-2xl">
						<h2 className="mb-5 text-2xl font-semibold text-center">
							{triggerType === "login" ? "Account & Sync" : "Settings"}
						</h2>
						<div className="space-y-4">
							{triggerType === "login" ? (
								<div className="p-4 border rounded-xl border-base-content/15 bg-base-200/40">
									<div className="mb-3 text-base font-semibold">
										Online Sync
									</div>
									<div className="mb-3 text-sm opacity-80">
										Connect an account to sync your user-created presets to the
										cloud.
									</div>

									{!onlineAuthSession ? (
										<div className="grid grid-cols-1 gap-2 mb-3 sm:grid-cols-2">
											<Button
												variant="primary"
												className="justify-center gap-2"
												onClick={() => handleSignIn("google")}
											>
												<FaGoogle size={14} /> Continue with Google
											</Button>
											<Button
												variant="neutral"
												className="justify-center gap-2"
												onClick={() => handleSignIn("apple")}
											>
												<FaApple size={14} /> Continue with Apple
											</Button>
										</div>
									) : (
										<div className="flex flex-wrap gap-2 mb-3">
											<Button variant="error" onClick={handleDisconnectAccount}>
												Disconnect Account
											</Button>
										</div>
									)}

									<div className="mb-3 text-xs opacity-80">
										Status:{" "}
										{onlineSyncSettings.enabled ? "Enabled" : "Local-only"}
									</div>
									<div className="text-xs opacity-80">
										Account:{" "}
										{onlineAuthSession
											? `${onlineAuthSession.displayName || onlineAuthSession.userId} (${onlineAuthSession.provider})`
											: "Not connected"}
									</div>

									{onlineSyncSettings.enabled && (
										<div className="grid grid-cols-1 gap-2 mt-3 sm:grid-cols-2">
											<Button
												variant="primary"
												className="gap-2"
												onClick={handleBackupNow}
											>
												<FaCloudUploadAlt size={14} /> Backup Now
											</Button>
											<Button
												variant="secondary"
												onClick={handleRestoreFromBackup}
											>
												Restore from Backup
											</Button>
										</div>
									)}
								</div>
							) : (
								<>
									<div className="grid grid-cols-1 gap-3 md:grid-cols-2">
										<div className="w-full form-control">
											<div className="label">
												<span className="label-text">
													Factory Preset Library
												</span>
											</div>
											<Button
												onClick={handleAddFactoryPresets}
												variant="neutral"
											>
												Add Factory Presets
											</Button>
										</div>

										<div className="w-full form-control">
											<div className="label">
												<span className="label-text">Reset Data</span>
											</div>
											<Button onClick={handleOpenResetModal} variant="error">
												Reset Local Data
											</Button>
										</div>
									</div>

									<div className="pt-2 border-t border-base-content/10">
										<div className="mb-2 text-sm font-semibold opacity-80">
											Backup & Import
										</div>
										<div className="grid grid-cols-1 gap-3 md:grid-cols-2">
											<div className="w-full form-control">
												<div className="label">
													<span className="label-text">
														Export Full Workspace Backup
													</span>
												</div>
												<Button
													onClick={handleExportWorkspace}
													variant="accent"
												>
													Export Full Backup
												</Button>
											</div>

											<div className="w-full form-control">
												<div className="label">
													<span className="label-text">Export Database</span>
												</div>
												<Button onClick={handleExport} variant="primary">
													Export
												</Button>
											</div>

											<div className="w-full form-control md:col-span-2">
												<div className="label">
													<span className="label-text">Import Database</span>
												</div>
												<div className="max-w-md">
													<FileInput
														accept="application/json"
														onChange={handleImport}
														tone="secondary"
													/>
												</div>
											</div>
										</div>
									</div>
								</>
							)}

							<Button
								className="w-full"
								variant="error"
								onClick={handleCloseModal}
							>
								Close
							</Button>
						</div>
					</div>
					<form method="dialog" className="modal-backdrop">
						<Button type="button" onClick={handleCloseModal} unstyled>
							close
						</Button>
					</form>
				</dialog>
			)}

			{isResetModalOpen && (
				<dialog open className="modal modal-open">
					<div className="modal-box">
						<h3 className="text-lg font-bold">Reset Local Data</h3>
						<p className="py-2 text-sm opacity-80">
							This will permanently delete all local presets and synth backups
							on this device.
						</p>

						<label className="justify-start gap-3 cursor-pointer label">
							<input
								type="checkbox"
								className="checkbox checkbox-error"
								checked={resetCloudToo}
								onChange={(e) => setResetCloudToo(e.target.checked)}
								disabled={isResetting}
							/>
							<span className="label-text">Also clear cloud backup</span>
						</label>

						<div className="modal-action">
							<Button variant="secondary" onClick={handleCloseResetModal}>
								Cancel
							</Button>
							<Button
								variant="error"
								onClick={handleConfirmResetData}
								disabled={isResetting}
							>
								{isResetting ? "Resetting..." : "Confirm Reset"}
							</Button>
						</div>
					</div>
					<form method="dialog" className="modal-backdrop">
						<Button type="button" onClick={handleCloseResetModal} unstyled>
							close
						</Button>
					</form>
				</dialog>
			)}
		</>
	);
};

export default SettingsPanel;
