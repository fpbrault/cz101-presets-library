import { Component, createRef, type ReactElement, type RefObject } from "react";
import ControlKnob from "@/components/ControlKnob";
import { drawOscilloscope } from "@/lib/synth/drawOscilloscope";
import type { AsidePanelComponent } from "./AsidePanelSwitcher";
import SynthPanelContainer from "./SynthPanelContainer";

type ScopeTriggerMode = "off" | "rise" | "fall";

export type ScopePanelProps = {
	analyserNodeRef?: RefObject<AnalyserNode | null>;
	audioCtxRef?: RefObject<AudioContext | null>;
	effectivePitchHz: number;
	subscribeScopeFrames?: (
		onFrame: (frame: {
			samples: Float32Array;
			sampleRate: number;
			hz: number;
		}) => void,
	) => () => void;
};

type ScopePanelState = {
	scopeCycles: number;
	scopeVerticalZoom: number;
	scopeTriggerLevel: number;
	displayedHz: number;
};

function drawScopeBackdrop(canvas: HTMLCanvasElement) {
	const ctx = canvas.getContext("2d");
	if (!ctx) return;
	const dpr = window.devicePixelRatio || 1;
	const drawWidth = Math.max(1, Math.floor(canvas.clientWidth));
	const drawHeight = Math.max(1, Math.floor(canvas.clientHeight));
	const pixelWidth = Math.floor(drawWidth * dpr);
	const pixelHeight = Math.floor(drawHeight * dpr);
	if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
		canvas.width = pixelWidth;
		canvas.height = pixelHeight;
	}
	ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
	ctx.fillStyle = "#051005";
	ctx.fillRect(0, 0, drawWidth, drawHeight);
	ctx.strokeStyle = "rgba(0, 120, 0, 0.35)";
	ctx.lineWidth = 1;
	for (let y = 0.25; y < 1; y += 0.25) {
		ctx.beginPath();
		ctx.moveTo(0, drawHeight * y);
		ctx.lineTo(drawWidth, drawHeight * y);
		ctx.stroke();
	}
	for (let x = 0.1; x < 1; x += 0.1) {
		ctx.beginPath();
		ctx.moveTo(drawWidth * x, 0);
		ctx.lineTo(drawWidth * x, drawHeight);
		ctx.stroke();
	}
	ctx.strokeStyle = "rgba(0, 120, 0, 0.6)";
	ctx.lineWidth = 1.5;
	ctx.beginPath();
	ctx.moveTo(0, drawHeight / 2);
	ctx.lineTo(drawWidth, drawHeight / 2);
	ctx.stroke();
}

class ScopePanel extends Component<ScopePanelProps, ScopePanelState> {
	static panelId = "scope" as const;
	static panelTab = { topLabel: "Scope", bottomLabel: "View" } as const;

	private readonly scopeTriggerMode: ScopeTriggerMode = "rise";
	private rafId = 0;
	private readonly canvasRef = createRef<HTMLCanvasElement>();
	private unsubscribeScopeFrames: (() => void) | null = null;

	constructor(props: ScopePanelProps) {
		super(props);
		this.state = {
			scopeCycles: 4,
			scopeVerticalZoom: 1,
			scopeTriggerLevel: 128,
			displayedHz: props.effectivePitchHz,
		};
	}

	componentDidMount() {
		this.subscribeToScopeFrames();
		this.startDrawLoop();
	}

	componentDidUpdate(prevProps: ScopePanelProps) {
		if (prevProps.subscribeScopeFrames !== this.props.subscribeScopeFrames) {
			this.subscribeToScopeFrames();
		}
		if (
			prevProps.effectivePitchHz !== this.props.effectivePitchHz &&
			this.state.displayedHz !== this.props.effectivePitchHz
		) {
			this.setState({ displayedHz: this.props.effectivePitchHz });
		}
	}

	componentWillUnmount() {
		window.cancelAnimationFrame(this.rafId);
		this.unsubscribeScopeFrames?.();
		this.unsubscribeScopeFrames = null;
	}

	private subscribeToScopeFrames() {
		this.unsubscribeScopeFrames?.();
		this.unsubscribeScopeFrames = null;
		if (!this.props.subscribeScopeFrames) {
			return;
		}
		this.unsubscribeScopeFrames = this.props.subscribeScopeFrames((frame) => {
			const canvas = this.canvasRef.current;
			if (!canvas) return;
			this.drawScopeFrame(
				canvas,
				frame.samples,
				Math.max(1, frame.hz),
				frame.sampleRate,
			);
			if (this.state.displayedHz !== frame.hz) {
				this.setState({ displayedHz: frame.hz });
			}
		});
	}

	private startDrawLoop() {
		const draw = () => {
			this.rafId = window.requestAnimationFrame(draw);
			const canvas = this.canvasRef.current;
			if (!canvas) return;

			const analyser = this.props.analyserNodeRef?.current;
			if (!analyser) {
				drawScopeBackdrop(canvas);
				return;
			}

			const data = new Uint8Array(analyser.fftSize);
			analyser.getByteTimeDomainData(data);
			const sampleRate = this.props.audioCtxRef?.current?.sampleRate ?? 44100;
			const hz = Math.max(1, this.props.effectivePitchHz);
			this.drawScopeFrame(canvas, data, hz, sampleRate);
		};

		draw();
	}

	private drawScopeFrame(
		canvas: HTMLCanvasElement,
		samples: Uint8Array | Float32Array,
		hz: number,
		sampleRate: number,
	) {
		drawOscilloscope(
			canvas,
			samples,
			{
				cycles: this.state.scopeCycles,
				verticalZoom: this.state.scopeVerticalZoom,
				triggerLevel: this.state.scopeTriggerLevel,
				triggerMode: this.scopeTriggerMode,
			},
			hz,
			sampleRate,
		);
	}

	render(): ReactElement {
		const { scopeCycles, scopeVerticalZoom, scopeTriggerLevel, displayedHz } =
			this.state;

		return (
			<SynthPanelContainer>
				<div className="space-y-2">
					<div className="relative overflow-hidden rounded-lg border border-cz-border bg-cz-lcd-bg">
						<div className="absolute left-2 top-1 text-5xs font-mono text-cz-lcd-fg/60">
							CH1
						</div>
						<div className="absolute right-3 top-3 text-3xs font-mono uppercase tracking-[0.2em] text-cz-lcd-fg/60">
							{displayedHz.toFixed(1)} Hz
						</div>
						<canvas
							ref={this.canvasRef}
							width={900}
							height={220}
							className="h-36 w-full"
							style={{ imageRendering: "pixelated" }}
						/>
					</div>
					<div className="flex justify-center gap-2">
						<ControlKnob
							value={scopeCycles}
							onChange={(value) => this.setState({ scopeCycles: value })}
							min={0.5}
							max={8}
							size={48}
							color="#3dff3d"
							label="Cycles"
							valueFormatter={(value) => value.toFixed(1)}
						/>
						<ControlKnob
							value={scopeVerticalZoom}
							onChange={(value) => this.setState({ scopeVerticalZoom: value })}
							min={0.25}
							max={4}
							size={48}
							color="#9cb937"
							label="Zoom"
							valueFormatter={(value) => `${value.toFixed(1)}x`}
						/>
						<ControlKnob
							value={scopeTriggerLevel}
							onChange={(value) =>
								this.setState({ scopeTriggerLevel: Math.round(value) })
							}
							min={0}
							max={255}
							size={48}
							color="#7f9de4"
							label="Trig"
							valueFormatter={(value) => `${Math.round(value)}`}
						/>
					</div>
				</div>
			</SynthPanelContainer>
		);
	}
}

const ScopePanelComponent = ScopePanel as unknown as ((
	props: ScopePanelProps,
) => ReactElement) &
	AsidePanelComponent<"scope">;

export default ScopePanelComponent;
