import PhaseDistortionVisualizer from "@/components/PhaseDistortionVisualizer";

export default function VisualizerPage() {
	return (
		<div className="flex flex-col items-center gap-4 p-4 overflow-auto w-full">
			<h1 className="text-2xl font-bold">Phase Distortion Visualizer</h1>
			<PhaseDistortionVisualizer />
		</div>
	);
}
