import "./App.css";

import { QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { createBrowserRouter, RouterProvider } from "react-router";
import Button from "@/components/ui/Button";
import { MidiChannelProvider } from "@/context/MidiChannelContext";
import { MidiPortProvider } from "@/context/MidiPortContext";
import { SearchFilterProvider } from "@/context/SearchFilterContext";
import { SidebarProvider } from "@/context/SidebarContext";
import { ToastProvider, useToast } from "@/context/ToastContext";
import { refreshOnlineAuthSession } from "@/lib/auth/onlineAuthSession";
import {
	acceptFactoryPresetsOnboarding,
	declineFactoryPresetsOnboarding,
	ensureFactoryPresetsOnFirstUse,
} from "@/lib/presets/presetManager";
import { saveOnlineSyncSettings } from "@/lib/sync/onlineSyncSettings";
import { configurePresetSyncAdapterFromSettings } from "@/lib/sync/remotePresetSyncAdapter";
import { routes } from "@/routes/index";
import { queryClient } from "@/utils/queryClient";

function AppInner() {
	const { notifySuccess, notifyInfo } = useToast();
	const [showOnboardingModal, setShowOnboardingModal] = useState(false);

	useEffect(() => {
		if (
			window.opener &&
			new URLSearchParams(window.location.search).get("auth_popup") === "1"
		) {
			try {
				window.opener.postMessage(
					{ type: "auth_complete" },
					window.location.origin,
				);
			} catch {}
			window.close();
			return;
		}

		void (async () => {
			const session = await refreshOnlineAuthSession();
			saveOnlineSyncSettings({ enabled: Boolean(session?.userId) });
			configurePresetSyncAdapterFromSettings();

			const onboardingStatus = await ensureFactoryPresetsOnFirstUse();
			if (onboardingStatus === "needs-confirmation") {
				setShowOnboardingModal(true);
			}
		})();
	}, []);

	const handleAcceptOnboarding = () => {
		setShowOnboardingModal(false);
		void (async () => {
			const loaded = await acceptFactoryPresetsOnboarding();
			if (loaded) {
				await queryClient.invalidateQueries({ queryKey: ["presets"] });
				notifySuccess("Factory presets loaded into your library.");
			} else {
				notifyInfo("Factory presets are already in your library.");
			}
		})();
	};

	const handleDeclineOnboarding = () => {
		declineFactoryPresetsOnboarding();
		setShowOnboardingModal(false);
	};

	return (
		<>
			<RouterProvider router={createBrowserRouter(routes)} />

			{showOnboardingModal && (
				<dialog open className="modal modal-open">
					<div className="modal-box">
						<h3 className="text-lg font-bold">
							Welcome to CZ101 Presets Library
						</h3>
						<p className="py-2 text-sm opacity-80">
							Load factory presets (Temple of CZ) into your local library? You
							can add them later from Settings.
						</p>
						<div className="modal-action">
							<Button variant="secondary" onClick={handleDeclineOnboarding}>
								Skip
							</Button>
							<Button variant="primary" onClick={handleAcceptOnboarding}>
								Load Factory Presets
							</Button>
						</div>
					</div>
				</dialog>
			)}
		</>
	);
}

export default function App() {
	return (
		<ToastProvider>
			<QueryClientProvider client={queryClient}>
				<MidiPortProvider>
					<MidiChannelProvider>
						<SearchFilterProvider>
							<SidebarProvider>
								<AppInner />
							</SidebarProvider>
						</SearchFilterProvider>
					</MidiChannelProvider>
				</MidiPortProvider>
			</QueryClientProvider>
		</ToastProvider>
	);
}
