import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@/App.css";
import PluginPage from "../../cosmo-pd101/webview/src/PluginPage";

const root = document.getElementById("root");
if (!root) throw new Error("No #root element found");

createRoot(root).render(
	<StrictMode>
		<PluginPage />
	</StrictMode>,
);
