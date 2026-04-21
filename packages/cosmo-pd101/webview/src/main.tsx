import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { initI18n } from "./i18n";
import "./index.css";
import App from "./App";

initI18n();

const root = document.getElementById("root");
if (!root) throw new Error("No #root element found");

createRoot(root).render(
	<StrictMode>
		<App />
	</StrictMode>,
);
