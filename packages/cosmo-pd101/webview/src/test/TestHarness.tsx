/**
 * TestHarness — Wraps the plugin UI for mock-host E2E testing.
 *
 * Rendered instead of App when VITE_TEST_HARNESS=1.
 * Shows a collapsible Debug Panel with:
 *   - Virtual DSP param snapshot
 *   - Outbound message history (last 20)
 *   - Manual param push controls for inbound simulation
 *
 * Visibility: always shown when VITE_TEST_HARNESS=1.
 * Also toggleable in local dev via VITE_DEBUG_PANEL=1 (opens by default).
 *
 * TODO: Remove when harness is promoted to a permanent CI fixture.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import App from "../App";
import type { MockBridgeMessage } from "./mockPluginBridge";

// Toggle-open default: respect VITE_DEBUG_PANEL env or fall back to test mode.
const DEBUG_PANEL_DEFAULT_OPEN = import.meta.env.VITE_DEBUG_PANEL === "1";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function MessageRow({ msg }: { msg: MockBridgeMessage }) {
	const color =
		msg.type === "param:set"
			? "text-green-400"
			: msg.type === "param:begin"
				? "text-sky-400"
				: msg.type === "param:end"
					? "text-yellow-400"
					: msg.type === "invoke"
						? "text-purple-400"
						: "text-base-content/60";

	return (
		<div
			className={`flex gap-1 border-b border-base-content/5 py-0.5 ${color}`}
		>
			<span className="w-20 shrink-0 font-bold">{msg.type}</span>
			<span className="truncate text-base-content/70">
				{JSON.stringify(msg).slice(0, 80)}
			</span>
		</div>
	);
}

// ---------------------------------------------------------------------------
// TestHarness
// ---------------------------------------------------------------------------

export default function TestHarness() {
	const [panelOpen, setPanelOpen] = useState(DEBUG_PANEL_DEFAULT_OPEN);
	const [messages, setMessages] = useState<MockBridgeMessage[]>([]);
	const [virtualState, setVirtualState] = useState<Record<number, number>>({});

	// Inbound simulation form state
	const [pushLegacyId, setPushLegacyId] = useState("0");
	const [pushValue, setPushValue] = useState("0.5");
	const messagesEndRef = useRef<HTMLDivElement>(null);

	// Subscribe to mock bridge events.
	useEffect(() => {
		const bridge = window.__MOCK_BRIDGE__;
		if (!bridge) return;

		// Seed with any messages that arrived before mount.
		setMessages(bridge.getMessages().slice(-20));
		setVirtualState(bridge.getState());

		const unsub = bridge.onMessage(() => {
			setMessages(bridge.getMessages().slice(-20));
			setVirtualState(bridge.getState());
		});

		return unsub;
	}, []);

	// Scroll to latest message when messages array changes.
	// biome-ignore lint/correctness/useExhaustiveDependencies: intentional — triggers scroll on new messages
	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [messages]);

	const handlePushParam = useCallback(() => {
		const id = Number.parseInt(pushLegacyId, 10);
		const val = Number.parseFloat(pushValue);
		if (!Number.isNaN(id) && !Number.isNaN(val)) {
			window.__MOCK_BRIDGE__?.pushParamUpdate(id, val);
		}
	}, [pushLegacyId, pushValue]);

	const handleClearMessages = useCallback(() => {
		window.__MOCK_BRIDGE__?.clearMessages();
		setMessages([]);
	}, []);

	return (
		<div className="relative h-dvh" data-testid="test-harness">
			{/* The actual plugin UI — unchanged from production */}
			<App />

			{/* Floating toggle button — always present in test mode */}
			<button
				type="button"
				className="fixed bottom-2 left-2 z-[9999] rounded border border-base-content/30 bg-base-300/90 px-2 py-1 font-mono text-2xs text-base-content/80 shadow backdrop-blur hover:bg-base-300"
				onClick={() => setPanelOpen((o) => !o)}
				data-testid="debug-panel-toggle"
			>
				{panelOpen ? "Hide Mock Debug" : "Mock Debug"}
			</button>

			{/* Debug Panel */}
			{panelOpen && (
				<div
					className="fixed bottom-8 left-2 z-[9998] flex max-h-[60vh] w-80 flex-col overflow-hidden rounded border border-base-content/30 bg-base-300/95 shadow-xl backdrop-blur"
					data-testid="debug-panel"
				>
					{/* Header */}
					<div className="flex items-center justify-between border-b border-base-content/20 px-3 py-1.5">
						<span className="font-mono text-2xs font-bold text-base-content/80">
							MOCK HOST DEBUG
						</span>
						<span
							className="font-mono text-3xs text-base-content/50"
							data-testid="debug-message-count"
						>
							{messages.length} msgs
						</span>
					</div>

					{/* Virtual DSP state */}
					<div className="border-b border-base-content/10 px-3 py-1.5">
						<div className="mb-1 font-mono text-3xs uppercase tracking-wider text-base-content/50">
							Virtual DSP State
						</div>
						<div
							className="grid grid-cols-2 gap-x-2 gap-y-0.5 font-mono text-3xs"
							data-testid="debug-dsp-state"
						>
							{Object.entries(virtualState).map(([id, val]) => (
								<div
									key={id}
									className="flex justify-between text-base-content/70"
								>
									<span>id:{id}</span>
									<span className="text-primary">{val.toFixed(3)}</span>
								</div>
							))}
						</div>
					</div>

					{/* Inbound push controls */}
					<div className="border-b border-base-content/10 px-3 py-1.5">
						<div className="mb-1 font-mono text-3xs uppercase tracking-wider text-base-content/50">
							Push Inbound (Legacy ID → Value)
						</div>
						<div className="flex gap-1">
							<input
								type="number"
								value={pushLegacyId}
								onChange={(e) => setPushLegacyId(e.target.value)}
								className="w-16 rounded border border-base-content/20 bg-base-200 px-1 font-mono text-2xs text-base-content outline-none focus:border-primary"
								placeholder="ID"
								data-testid="debug-push-id"
							/>
							<input
								type="number"
								step="0.1"
								value={pushValue}
								onChange={(e) => setPushValue(e.target.value)}
								className="w-20 rounded border border-base-content/20 bg-base-200 px-1 font-mono text-2xs text-base-content outline-none focus:border-primary"
								placeholder="Value"
								data-testid="debug-push-value"
							/>
							<button
								type="button"
								onClick={handlePushParam}
								className="rounded border border-primary/60 px-2 font-mono text-2xs text-primary hover:bg-primary/10"
								data-testid="debug-push-btn"
							>
								Push
							</button>
						</div>
					</div>

					{/* Message history */}
					<div className="flex min-h-0 flex-1 flex-col overflow-hidden px-3 py-1.5">
						<div className="mb-1 flex items-center justify-between">
							<span className="font-mono text-3xs uppercase tracking-wider text-base-content/50">
								Message Log
							</span>
							<button
								type="button"
								onClick={handleClearMessages}
								className="font-mono text-3xs text-error/70 hover:text-error"
								data-testid="debug-clear-btn"
							>
								Clear
							</button>
						</div>
						<div
							className="flex-1 overflow-y-auto font-mono text-3xs"
							data-testid="debug-message-log"
						>
							{messages.length === 0 ? (
								<div className="py-2 text-center text-base-content/30">
									No messages yet
								</div>
							) : (
								messages.map((msg, i) => (
									// biome-ignore lint/suspicious/noArrayIndexKey: display-only list
									<MessageRow key={i} msg={msg} />
								))
							)}
							<div ref={messagesEndRef} />
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
