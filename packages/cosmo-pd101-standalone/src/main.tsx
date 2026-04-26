import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import SettingsPage from "./components/SettingsPage";
import "./styles.css";

const queryClient = new QueryClient();
const isSettingsWindow =
	new URLSearchParams(window.location.search).get("page") === "settings";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
	<React.StrictMode>
		<QueryClientProvider client={queryClient}>
			{isSettingsWindow ? <SettingsPage /> : <App />}
		</QueryClientProvider>
	</React.StrictMode>,
);
