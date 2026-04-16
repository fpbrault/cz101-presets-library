import PluginPage from "@/features/plugin/PluginPage";
import "@/App.css";
import { ensureBeamerLegacyBridge } from "./beamerLegacyBridge";

export default function App() {
	ensureBeamerLegacyBridge();

	return <PluginPage />;
}
