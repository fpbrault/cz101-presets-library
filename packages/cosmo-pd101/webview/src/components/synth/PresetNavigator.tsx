import { useRef, useState } from "react";
import type { Preset } from "@/lib/presets/presetManager";

export type PresetEntry = {
	id: string;
	label: string;
	type: "local" | "library" | "builtin";
	preset?: Preset;
};

type PresetNavigatorProps = {
	allEntries: PresetEntry[];
	activeEntryId: string | null;
	activePresetName: string;
	onLoadLocal: (name: string) => void;
	onLoadLibrary: (preset: Preset) => void;
	onLoadBuiltin: (name: string) => void;
	onStepPreset: (direction: -1 | 1) => void;
	onSavePreset: (name: string) => void;
	onDeletePreset: (name: string) => void;
	onRenamePreset: (oldName: string, newName: string) => void;
	onExportPreset: (name: string) => void;
	onExportCurrentState: (name: string) => void;
	onImportPreset: (json: string, filename: string) => void;
	onInitPreset: () => void;
};

export default function PresetNavigator({
	allEntries,
	activeEntryId,
	activePresetName,
	onLoadLocal,
	onLoadLibrary,
	onLoadBuiltin,
	onStepPreset,
	onSavePreset,
	onDeletePreset,
	onRenamePreset,
	onExportPreset,
	onExportCurrentState,
	onImportPreset,
	onInitPreset,
}: PresetNavigatorProps) {
	const [panelOpen, setPanelOpen] = useState(false);
	const [saveName, setSaveName] = useState("");
	const [importError, setImportError] = useState<string | null>(null);
	const [renamingId, setRenamingId] = useState<string | null>(null);
	const [renameValue, setRenameValue] = useState("");
	const importFileRef = useRef<HTMLInputElement>(null);

	const handleLoad = (entry: PresetEntry) => {
		if (entry.type === "local") {
			onLoadLocal(entry.label);
		} else if (entry.type === "builtin") {
			onLoadBuiltin(entry.label);
		} else if (entry.preset) {
			onLoadLibrary(entry.preset);
		}
		setPanelOpen(false);
	};

	const startRename = (entry: PresetEntry) => {
		setRenamingId(entry.id);
		setRenameValue(entry.label);
	};

	const commitRename = (oldName: string) => {
		const newName = renameValue.trim();
		if (newName && newName !== oldName) {
			onRenamePreset(oldName, newName);
		}
		setRenamingId(null);
		setRenameValue("");
	};

	const handleSave = () => {
		const name = saveName.trim();
		if (!name) return;
		onSavePreset(name);
		setSaveName("");
	};

	const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;
		// Strip .json extension for the preset name
		const filename = file.name.replace(/\.json$/i, "");
		const reader = new FileReader();
		reader.onload = (ev) => {
			const text = ev.target?.result;
			if (typeof text !== "string") return;
			try {
				onImportPreset(text, filename);
				setImportError(null);
			} catch {
				setImportError("Invalid preset file.");
			}
		};
		reader.readAsText(file);
		// reset so the same file can be re-imported
		e.target.value = "";
	};

	const localEntries = allEntries.filter((e) => e.type === "local");
	const builtinEntries = allEntries.filter((e) => e.type === "builtin");
	const libraryEntries = allEntries.filter((e) => e.type === "library");

	return (
		<div className="relative w-full max-w-3xl">
			<div className="flex items-center gap-1">
				<button
					type="button"
					className="cz-btn-arrow"
					onClick={() => onStepPreset(-1)}
					disabled={allEntries.length === 0}
					aria-label="Previous preset"
				>
					<svg
						viewBox="0 -960 960 960"
						className="w-10 h-10 fill-cz-cream"
						xmlns="http://www.w3.org/2000/svg"
						aria-hidden="true"
					>
						<path d="M640-197 200-477l440-280v560Zm-60-280Zm0 171v-342L311-477l269 171Z" />
					</svg>
				</button>
				<div className="flex flex-1 items-stretch overflow-hidden rounded-xl border border-cz-border bg-cz-inset">
					<button
						type="button"
						className="flex min-w-0 flex-1 flex-col items-center justify-center px-4 py-2 text-center transition hover:bg-cz-surface"
						onClick={() => setPanelOpen((open) => !open)}
					>
						<span className="text-3xs font-mono uppercase tracking-[0.32em] text-cz-gold">
							Preset
						</span>
						<span className="truncate text-lg font-mono font-bold text-cz-cream">
							{activePresetName}
						</span>
					</button>
				</div>
				<button
					type="button"
					className="cz-btn-arrow"
					onClick={() => onStepPreset(1)}
					disabled={allEntries.length === 0}
					aria-label="Next preset"
				>
					<svg
						viewBox="0 -960 960 960"
						className="w-10 h-10 fill-cz-cream rotate-180"
						xmlns="http://www.w3.org/2000/svg"
						aria-hidden="true"
					>
						<path d="M640-197 200-477l440-280v560Zm-60-280Zm0 171v-342L311-477l269 171Z" />
					</svg>
				</button>
			</div>

			{panelOpen && (
				<div className="absolute right-0 top-[calc(100%+0.5rem)] z-20 w-full overflow-hidden rounded-xl border border-cz-border bg-cz-panel shadow-2xl lg:w-120">
					{/* Save / Export current state */}
					<div className="border-b border-cz-border bg-cz-surface px-4 py-2">
						<p className="mb-1.5 text-3xs font-mono uppercase tracking-[0.28em] text-cz-cream">
							Save / Export Current State
						</p>
						<div className="flex gap-2">
							<input
								type="text"
								className="flex-1 rounded-lg border border-cz-border bg-cz-inset px-3 py-1.5 text-sm text-cz-cream placeholder-cz-cream-dim/50 outline-none focus:border-cz-gold"
								placeholder="Preset name…"
								value={saveName}
								onChange={(e) => setSaveName(e.target.value)}
								onKeyDown={(e) => {
									e.stopPropagation();
									if (e.key === "Enter") handleSave();
								}}
							/>
							<button
								type="button"
								disabled={!saveName.trim()}
								className="rounded-lg bg-cz-gold px-3 py-1.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-40"
								onClick={handleSave}
							>
								Save
							</button>
							<button
								type="button"
								disabled={!saveName.trim()}
								title="Export current state as JSON file"
								className="rounded-lg border border-cz-border px-3 py-1.5 text-sm text-cz-light-blue transition hover:bg-cz-inset disabled:opacity-40"
								onClick={() => {
									const name = saveName.trim();
									if (!name) return;
									onExportCurrentState(name);
								}}
							>
								Export
							</button>
						</div>
					</div>

					{/* Import + Init */}
					<div className="flex items-center justify-between border-b border-cz-border bg-cz-surface px-4 py-2 gap-2">
						<span className="text-3xs font-mono uppercase tracking-[0.28em] text-cz-cream shrink-0">
							Import from file
						</span>
						<div className="flex gap-2 shrink-0">
							<button
								type="button"
								className="rounded-lg border border-cz-border px-3 py-1 text-xs text-cz-cream transition hover:bg-cz-inset"
								onClick={() => importFileRef.current?.click()}
							>
								Choose JSON…
							</button>
							<button
								type="button"
								title="Reset all parameters to default values"
								className="rounded-lg border border-cz-border px-3 py-1 text-xs text-red-400 transition hover:bg-cz-inset"
								onClick={() => {
									onInitPreset();
									setPanelOpen(false);
								}}
							>
								Init
							</button>
						</div>
						<input
							ref={importFileRef}
							type="file"
							accept=".json,application/json"
							className="hidden"
							onChange={handleImportFile}
						/>
					</div>
					{importError && (
						<p className="bg-red-900/30 px-4 py-1.5 text-xs text-red-400">
							{importError}
						</p>
					)}

					{/* Preset list */}
					<div className="border-b border-cz-border bg-cz-surface px-4 py-2 text-3xs font-mono uppercase tracking-[0.28em] text-cz-cream">
						Preset List
					</div>
					<div className="max-h-72 overflow-y-auto p-2">
						{allEntries.length === 0 ? (
							<div className="px-3 py-4 text-sm text-cz-cream">
								No presets available.
							</div>
						) : (
							<>
								{builtinEntries.length > 0 && (
									<>
										<p className="px-2 py-1 text-4xs font-mono uppercase tracking-widest text-cz-cream/60">
											Built-in
										</p>
										{builtinEntries.map((entry) => (
											<button
												key={entry.id}
												type="button"
												className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left ${
													entry.id === activeEntryId
														? "bg-cz-gold text-white"
														: "text-cz-cream hover:bg-cz-surface"
												}`}
												onClick={() => handleLoad(entry)}
											>
												<span className="truncate">{entry.label}</span>
												<span
													className={`ml-3 shrink-0 text-3xs font-mono uppercase tracking-[0.22em] ${
														entry.id === activeEntryId
															? "text-white/75"
															: "text-cz-cream-dim"
													}`}
												>
													built-in
												</span>
											</button>
										))}
									</>
								)}

								{localEntries.length > 0 && (
									<>
										<p className="mt-1 px-2 py-1 text-4xs font-mono uppercase tracking-widest text-cz-cream/60">
											My Presets
										</p>
										{localEntries.map((entry) => (
											<div
												key={entry.id}
												className={`group flex w-full items-center rounded-lg px-3 py-2 ${
													entry.id === activeEntryId
														? "bg-cz-gold"
														: "hover:bg-cz-surface"
												}`}
											>
												{renamingId === entry.id ? (
													/* ── Inline rename row ── */
													<>
														<input
															type="text"
															className="flex-1 rounded border border-cz-gold bg-cz-inset px-2 py-0.5 text-sm text-cz-cream outline-none"
															value={renameValue}
															onChange={(e) => setRenameValue(e.target.value)}
															onKeyDown={(e) => {
																e.stopPropagation();
																if (e.key === "Enter")
																	commitRename(entry.label);
																if (e.key === "Escape") {
																	setRenamingId(null);
																	setRenameValue("");
																}
															}}
														/>
														<button
															type="button"
															title="Confirm rename"
															className="ml-1.5 rounded px-1.5 py-0.5 text-3xs font-mono text-cz-gold hover:bg-cz-inset"
															onClick={() => commitRename(entry.label)}
														>
															✓
														</button>
														<button
															type="button"
															title="Cancel"
															className="rounded px-1.5 py-0.5 text-3xs font-mono text-cz-cream hover:bg-cz-inset"
															onClick={() => {
																setRenamingId(null);
																setRenameValue("");
															}}
														>
															✕
														</button>
													</>
												) : (
													/* ── Normal row ── */
													<>
														<button
															type="button"
															className="flex flex-1 items-center justify-between text-left"
															onClick={() => handleLoad(entry)}
														>
															<span
																className={`truncate ${
																	entry.id === activeEntryId
																		? "text-white"
																		: "text-cz-cream"
																}`}
															>
																{entry.label}
															</span>
															<span
																className={`ml-3 shrink-0 text-3xs font-mono uppercase tracking-[0.22em] ${
																	entry.id === activeEntryId
																		? "text-white/75"
																		: "text-cz-cream-dim"
																}`}
															>
																local
															</span>
														</button>
														{/* Rename / Export / Delete */}
														<div className="ml-2 flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
															<button
																type="button"
																title="Rename preset"
																className="rounded px-1.5 py-0.5 text-3xs font-mono text-cz-cream hover:bg-cz-inset"
																onClick={(e) => {
																	e.stopPropagation();
																	startRename(entry);
																}}
															>
																✎
															</button>
															<button
																type="button"
																title="Export preset to JSON file"
																className="rounded px-1.5 py-0.5 text-3xs font-mono text-cz-light-blue hover:bg-cz-inset"
																onClick={(e) => {
																	e.stopPropagation();
																	onExportPreset(entry.label);
																	setPanelOpen(false);
																}}
															>
																↓
															</button>
															<button
																type="button"
																title="Delete preset"
																className="rounded px-1.5 py-0.5 text-3xs font-mono text-red-400 hover:bg-cz-inset"
																onClick={(e) => {
																	e.stopPropagation();
																	onDeletePreset(entry.label);
																}}
															>
																✕
															</button>
														</div>
													</>
												)}
											</div>
										))}
									</>
								)}

								{libraryEntries.length > 0 && (
									<>
										<p className="mt-1 px-2 py-1 text-4xs font-mono uppercase tracking-widest text-cz-cream/60">
											Library
										</p>
										{libraryEntries.map((entry) => (
											<button
												key={entry.id}
												type="button"
												className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left ${
													entry.id === activeEntryId
														? "bg-cz-gold text-white"
														: "text-cz-cream hover:bg-cz-surface"
												}`}
												onClick={() => handleLoad(entry)}
											>
												<span className="truncate">{entry.label}</span>
												<span
													className={`ml-3 shrink-0 text-3xs font-mono uppercase tracking-[0.22em] ${
														entry.id === activeEntryId
															? "text-white/75"
															: "text-cz-cream-dim"
													}`}
												>
													library
												</span>
											</button>
										))}
									</>
								)}
							</>
						)}
					</div>
				</div>
			)}
		</div>
	);
}
