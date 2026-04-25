import { useEffect, useMemo, useRef, useState } from "react";
import type { LibraryPreset } from "@/features/synth/types/libraryPreset";
import type { PresetEntry } from "@/features/synth/types/presetEntry";

type PresetLibrary = {
	allEntries: PresetEntry[];
	activeEntryId: string | null;
	activePresetName: string;
	onLoadLocal: (name: string) => void;
	onLoadLibrary: (preset: LibraryPreset) => void;
	onLoadBuiltin: (name: string) => void;
	onSavePreset: (name: string) => void;
	onDeletePreset: (name: string) => void;
	onRenamePreset: (oldName: string, newName: string) => void;
	onExportPreset: (name: string) => void;
	onExportCurrentState: (name: string) => void;
	onImportPreset: (json: string, filename: string) => void;
	onInitPreset: () => void;
	onClose: () => void;
};

const sectionLabels: Record<PresetEntry["type"], string> = {
	builtin: "Built-in",
	local: "My Presets",
	library: "Library",
};

const typeLabels: Record<PresetEntry["type"], string> = {
	builtin: "Built-in",
	local: "User",
	library: "Library",
};

function getEntrySearchText(entry: PresetEntry) {
	return `${entry.label} ${sectionLabels[entry.type]}`.toLowerCase();
}

export default function PresetLibrary({
	allEntries,
	activeEntryId,
	activePresetName,
	onLoadLocal,
	onLoadLibrary,
	onLoadBuiltin,
	onSavePreset,
	onDeletePreset,
	onRenamePreset,
	onExportPreset,
	onExportCurrentState,
	onImportPreset,
	onInitPreset,
	onClose,
}: PresetLibrary) {
	const [search, setSearch] = useState("");
	const [saveName, setSaveName] = useState("");
	const [importError, setImportError] = useState<string | null>(null);
	const [renameEntry, setRenameEntry] = useState<PresetEntry | null>(null);
	const [renameValue, setRenameValue] = useState("");
	const [deleteEntry, setDeleteEntry] = useState<PresetEntry | null>(null);
	const [focusedEntryId, setFocusedEntryId] = useState(activeEntryId);
	const importFileRef = useRef<HTMLInputElement>(null);
	const rowRefs = useRef<Record<string, HTMLButtonElement | null>>({});

	const filteredEntries = useMemo(() => {
		const normalizedSearch = search.trim().toLowerCase();
		if (!normalizedSearch) return allEntries;
		return allEntries.filter((entry) =>
			getEntrySearchText(entry).includes(normalizedSearch),
		);
	}, [allEntries, search]);

	const sections = (["builtin", "local", "library"] as const)
		.map((type) => ({
			type,
			entries: filteredEntries.filter((entry) => entry.type === type),
		}))
		.filter((section) => section.entries.length > 0);

	const focusedEntry = filteredEntries.find(
		(entry) => entry.id === focusedEntryId,
	);

	useEffect(() => {
		if (filteredEntries.length === 0) {
			setFocusedEntryId(null);
			return;
		}
		if (!filteredEntries.some((entry) => entry.id === focusedEntryId)) {
			setFocusedEntryId(activeEntryId ?? filteredEntries[0]?.id ?? null);
		}
	}, [activeEntryId, filteredEntries, focusedEntryId]);

	useEffect(() => {
		if (!focusedEntryId) return;
		rowRefs.current[focusedEntryId]?.focus();
	}, [focusedEntryId]);

	const handleLoad = (entry: PresetEntry) => {
		if (entry.type === "local") {
			onLoadLocal(entry.label);
			return;
		}
		if (entry.type === "builtin") {
			onLoadBuiltin(entry.label);
			return;
		}
		if (entry.preset) {
			onLoadLibrary(entry.preset);
		}
	};

	const handleKeyboardNavigation = (
		event: React.KeyboardEvent<HTMLDivElement>,
	) => {
		if (filteredEntries.length === 0) return;
		const currentIndex = Math.max(
			0,
			filteredEntries.findIndex((entry) => entry.id === focusedEntryId),
		);
		if (event.key === "ArrowDown") {
			event.preventDefault();
			const nextEntry =
				filteredEntries[(currentIndex + 1) % filteredEntries.length];
			if (nextEntry) {
				setFocusedEntryId(nextEntry.id);
				handleLoad(nextEntry);
			}
		}
		if (event.key === "ArrowUp") {
			event.preventDefault();
			const prevEntry =
				filteredEntries[
					(currentIndex - 1 + filteredEntries.length) % filteredEntries.length
				];
			if (prevEntry) {
				setFocusedEntryId(prevEntry.id);
				handleLoad(prevEntry);
			}
		}
		if (event.key === "Home") {
			event.preventDefault();
			const firstEntry = filteredEntries[0];
			if (firstEntry) {
				setFocusedEntryId(firstEntry.id);
				handleLoad(firstEntry);
			}
		}
		if (event.key === "End") {
			event.preventDefault();
			const lastEntry = filteredEntries[filteredEntries.length - 1];
			if (lastEntry) {
				setFocusedEntryId(lastEntry.id);
				handleLoad(lastEntry);
			}
		}
		if (event.key === "End") {
			event.preventDefault();
			setFocusedEntryId(
				filteredEntries[filteredEntries.length - 1]?.id ?? null,
			);
		}
		if (event.key === "Enter" && focusedEntry) {
			event.preventDefault();
			handleLoad(focusedEntry);
		}
		if (event.key === "Escape") {
			event.preventDefault();
			onClose();
		}
	};

	const handleSave = () => {
		const name = saveName.trim();
		if (!name) return;
		onSavePreset(name);
		setSaveName("");
	};

	const handleExportCurrentState = () => {
		const name = saveName.trim();
		if (!name) return;
		onExportCurrentState(name);
	};

	const handleImportFile = (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		if (!file) return;
		const filename = file.name.replace(/\.json$/i, "");
		const reader = new FileReader();
		reader.onload = (readerEvent) => {
			const text = readerEvent.target?.result;
			if (typeof text !== "string") return;
			try {
				onImportPreset(text, filename);
				setImportError(null);
			} catch {
				setImportError("Invalid preset file.");
			}
		};
		reader.readAsText(file);
		event.target.value = "";
	};

	const openRenameModal = (entry: PresetEntry) => {
		setRenameEntry(entry);
		setRenameValue(entry.label);
	};

	const commitRename = () => {
		if (!renameEntry) return;
		const nextName = renameValue.trim();
		if (nextName && nextName !== renameEntry.label) {
			onRenamePreset(renameEntry.label, nextName);
		}
		setRenameEntry(null);
		setRenameValue("");
	};

	const commitDelete = () => {
		if (!deleteEntry) return;
		onDeletePreset(deleteEntry.label);
		setDeleteEntry(null);
	};

	return (
		<div className="relative z-10 flex min-h-0 flex-1 flex-col">
			<div className="flex min-h-0 flex-1 flex-col overflow-hidden  border border-cz-border bg-cz-panel">
				<div className="grid gap-3 border-b border-cz-border bg-cz-body px-5 py-4 lg:grid-cols-[1fr_auto] lg:items-center">
					<div>
						<p className="text-3xs font-mono uppercase tracking-[0.32em] text-cz-gold">
							Preset Library
						</p>
						<h2 className="mt-1 truncate text-xl font-mono font-bold text-cz-cream">
							{activePresetName}
						</h2>
					</div>
					<div className="flex flex-wrap items-center gap-2">
						<input
							type="text"
							className="h-10 min-w-48 rounded-md border border-cz-border bg-cz-inset px-3 text-sm text-cz-cream placeholder-cz-cream-dim/70 outline-none focus:border-cz-light-blue"
							placeholder="Search presets"
							value={search}
							onChange={(event) => setSearch(event.target.value)}
						/>
						<button
							type="button"
							className="btn btn-sm border-cz-border bg-cz-inset text-cz-cream hover:bg-cz-body"
							onClick={onClose}
						>
							Return
						</button>
					</div>
				</div>

				<div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1fr)_17rem]">
					<div
						className="min-h-0 overflow-y-auto [scrollbar-gutter:stable]"
						role="listbox"
						aria-label="Preset library"
						tabIndex={-1}
						onKeyDown={handleKeyboardNavigation}
					>
						<div className="grid grid-cols-[2rem_minmax(12rem,1.5fr)_8rem_7rem] border-b border-cz-border bg-cz-body px-4 py-2 text-4xs font-mono uppercase tracking-[0.22em] text-cz-cream-dim">
							<span />
							<span>Name</span>
							<span>Source</span>
							<span className="text-right">Actions</span>
						</div>
						{sections.length === 0 ? (
							<div className="px-5 py-10 text-sm text-cz-cream">
								No presets available.
							</div>
						) : (
							sections.map((section) => (
								<section key={section.type}>
									<div className="border-b border-cz-border/70 bg-cz-surface px-4 py-2 text-4xs font-mono uppercase tracking-[0.3em] text-cz-gold">
										{sectionLabels[section.type]}
									</div>
									{section.entries.map((entry) => {
										const active = entry.id === activeEntryId;
										const focused = entry.id === focusedEntryId;
										return (
											<div
												key={entry.id}
												className={`grid grid-cols-[2rem_minmax(12rem,1.5fr)_8rem_7rem] items-center border-b border-cz-border px-4 py-0.5 text-sm transition ${
													active
														? "bg-cz-surface/20"
														: focused
															? "bg-cz-surface/50 text-cz-cream"
															: "text-cz-cream bg-cz-surface hover:bg-cz-surface/30"
												}`}
											>
												<span className="font-mono text-cz-gold ">
													{active ? "*" : ""}
												</span>
												<button
													type="button"
													ref={(node) => {
														rowRefs.current[entry.id] = node;
													}}
													className="min-w-0 truncate rounded-sm py-2 text-left font-semibold outline-none text-cz-cream"
													onFocus={() => setFocusedEntryId(entry.id)}
													onClick={() => handleLoad(entry)}
												>
													{entry.label}
												</button>
												<span className="truncate text-3xs font-mono uppercase tracking-[0.18em] text-cz-cream-dim">
													{typeLabels[entry.type]}
												</span>
												<div className="flex justify-end gap-1">
													{entry.type === "local" ? (
														<>
															<button
																type="button"
																className="btn btn-ghost btn-xs text-cz-cream"
																aria-label={`Rename ${entry.label}`}
																onClick={() => openRenameModal(entry)}
															>
																Rename
															</button>
															<button
																type="button"
																className="btn btn-ghost btn-xs text-cz-light-blue"
																aria-label={`Export ${entry.label}`}
																onClick={() => onExportPreset(entry.label)}
															>
																Export
															</button>
															<button
																type="button"
																className="btn btn-ghost btn-xs text-red-400"
																aria-label={`Delete ${entry.label}`}
																onClick={() => setDeleteEntry(entry)}
															>
																Delete
															</button>
														</>
													) : null}
												</div>
											</div>
										);
									})}
								</section>
							))
						)}
					</div>

					<aside className="border-t border-cz-border bg-cz-surface p-4 lg:border-l lg:border-t-0">
						<div className="space-y-5">
							<section>
								<h3 className="mb-2 text-4xs font-mono uppercase tracking-[0.28em] text-cz-gold">
									Current State
								</h3>
								<input
									type="text"
									className="input input-sm w-full border-cz-border bg-cz-inset text-cz-cream placeholder-cz-cream-dim/70"
									placeholder="Preset name"
									value={saveName}
									onChange={(event) => setSaveName(event.target.value)}
									onKeyDown={(event) => {
										if (event.key === "Enter") handleSave();
									}}
								/>
								<div className="mt-2 grid grid-cols-2 gap-2">
									<button
										type="button"
										className="btn btn-sm bg-cz-gold text-white hover:brightness-110"
										disabled={!saveName.trim()}
										onClick={handleSave}
									>
										Save
									</button>
									<button
										type="button"
										className="btn btn-sm border-cz-border bg-cz-inset text-cz-light-blue"
										aria-label="Export current state"
										disabled={!saveName.trim()}
										onClick={handleExportCurrentState}
									>
										Export
									</button>
								</div>
							</section>

							<section>
								<h3 className="mb-2 text-4xs font-mono uppercase tracking-[0.28em] text-cz-gold">
									File
								</h3>
								<div className="grid grid-cols-2 gap-2">
									<button
										type="button"
										className="btn btn-sm border-cz-border bg-cz-inset text-cz-cream"
										onClick={() => importFileRef.current?.click()}
									>
										Import
									</button>
									<button
										type="button"
										className="btn btn-sm border-cz-border bg-cz-inset text-red-400"
										onClick={onInitPreset}
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
								{importError ? (
									<p className="mt-2 text-xs text-red-400">{importError}</p>
								) : null}
							</section>
						</div>
					</aside>
				</div>
			</div>

			<dialog className="modal" open={renameEntry !== null}>
				<div className="modal-box rounded-md border border-cz-border bg-cz-surface text-cz-cream">
					<h3 className="font-mono text-lg font-bold">Rename preset</h3>
					<input
						type="text"
						className="input mt-4 w-full border-cz-border bg-cz-inset text-cz-cream"
						value={renameValue}
						onChange={(event) => setRenameValue(event.target.value)}
						onKeyDown={(event) => {
							if (event.key === "Enter") commitRename();
							if (event.key === "Escape") setRenameEntry(null);
						}}
					/>
					<div className="modal-action">
						<button
							type="button"
							className="btn border-cz-border bg-cz-inset text-cz-cream"
							onClick={() => setRenameEntry(null)}
						>
							Cancel
						</button>
						<button
							type="button"
							className="btn bg-cz-gold text-white"
							aria-label="Confirm rename"
							onClick={commitRename}
						>
							Rename
						</button>
					</div>
				</div>
			</dialog>

			<dialog className="modal" open={deleteEntry !== null}>
				<div className="modal-box rounded-md border border-cz-border bg-cz-surface text-cz-cream">
					<h3 className="font-mono text-lg font-bold">Delete preset?</h3>
					<p className="mt-3 text-sm text-cz-cream-dim">
						{deleteEntry?.label} will be removed from your local presets.
					</p>
					<div className="modal-action">
						<button
							type="button"
							className="btn border-cz-border bg-cz-inset text-cz-cream"
							onClick={() => setDeleteEntry(null)}
						>
							Cancel
						</button>
						<button
							type="button"
							className="btn bg-red-700 text-white"
							aria-label="Confirm delete"
							onClick={commitDelete}
						>
							Delete
						</button>
					</div>
				</div>
			</dialog>
		</div>
	);
}
