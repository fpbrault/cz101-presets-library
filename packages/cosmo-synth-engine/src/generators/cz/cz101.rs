use super::{AlgoControlV1, AlgoDefinitionV1, AlgoRefV1};

const CZ_SAW_CONTROLS: [AlgoControlV1; 3] = [
	AlgoControlV1 {
		id: "waveform1",
		label: "Waveform 1",
		min: 0.0,
		max: 7.0,
		default: 0.0,
	},
	AlgoControlV1 {
		id: "waveform2",
		label: "Waveform 2",
		min: 0.0,
		max: 7.0,
		default: 0.0,
	},
	AlgoControlV1 {
		id: "windowFunction",
		label: "Window Function",
		min: 0.0,
		max: 5.0,
		default: 0.0,
	},
];

const CZ_SQUARE_CONTROLS: [AlgoControlV1; 3] = [
	AlgoControlV1 {
		id: "waveform1",
		label: "Waveform 1",
		min: 0.0,
		max: 7.0,
		default: 1.0,
	},
	AlgoControlV1 {
		id: "waveform2",
		label: "Waveform 2",
		min: 0.0,
		max: 7.0,
		default: 1.0,
	},
	AlgoControlV1 {
		id: "windowFunction",
		label: "Window Function",
		min: 0.0,
		max: 5.0,
		default: 0.0,
	},
];

const CZ_PULSE_CONTROLS: [AlgoControlV1; 3] = [
	AlgoControlV1 {
		id: "waveform1",
		label: "Waveform 1",
		min: 0.0,
		max: 7.0,
		default: 2.0,
	},
	AlgoControlV1 {
		id: "waveform2",
		label: "Waveform 2",
		min: 0.0,
		max: 7.0,
		default: 2.0,
	},
	AlgoControlV1 {
		id: "windowFunction",
		label: "Window Function",
		min: 0.0,
		max: 5.0,
		default: 0.0,
	},
];

const CZ_DOUBLE_SINE_CONTROLS: [AlgoControlV1; 3] = [
	AlgoControlV1 {
		id: "waveform1",
		label: "Waveform 1",
		min: 0.0,
		max: 7.0,
		default: 4.0,
	},
	AlgoControlV1 {
		id: "waveform2",
		label: "Waveform 2",
		min: 0.0,
		max: 7.0,
		default: 4.0,
	},
	AlgoControlV1 {
		id: "windowFunction",
		label: "Window Function",
		min: 0.0,
		max: 5.0,
		default: 0.0,
	},
];

const CZ_SAW_PULSE_CONTROLS: [AlgoControlV1; 3] = [
	AlgoControlV1 {
		id: "waveform1",
		label: "Waveform 1",
		min: 0.0,
		max: 7.0,
		default: 5.0,
	},
	AlgoControlV1 {
		id: "waveform2",
		label: "Waveform 2",
		min: 0.0,
		max: 7.0,
		default: 5.0,
	},
	AlgoControlV1 {
		id: "windowFunction",
		label: "Window Function",
		min: 0.0,
		max: 5.0,
		default: 0.0,
	},
];

const CZ_RESO1_CONTROLS: [AlgoControlV1; 3] = [
	AlgoControlV1 {
		id: "waveform1",
		label: "Waveform 1",
		min: 0.0,
		max: 7.0,
		default: 6.0,
	},
	AlgoControlV1 {
		id: "waveform2",
		label: "Waveform 2",
		min: 0.0,
		max: 7.0,
		default: 6.0,
	},
	AlgoControlV1 {
		id: "windowFunction",
		label: "Window Function",
		min: 0.0,
		max: 5.0,
		default: 1.0,
	},
];

const CZ_RESO2_CONTROLS: [AlgoControlV1; 3] = [
	AlgoControlV1 {
		id: "waveform1",
		label: "Waveform 1",
		min: 0.0,
		max: 7.0,
		default: 6.0,
	},
	AlgoControlV1 {
		id: "waveform2",
		label: "Waveform 2",
		min: 0.0,
		max: 7.0,
		default: 6.0,
	},
	AlgoControlV1 {
		id: "windowFunction",
		label: "Window Function",
		min: 0.0,
		max: 5.0,
		default: 2.0,
	},
];

const CZ_RESO3_CONTROLS: [AlgoControlV1; 3] = [
	AlgoControlV1 {
		id: "waveform1",
		label: "Waveform 1",
		min: 0.0,
		max: 7.0,
		default: 6.0,
	},
	AlgoControlV1 {
		id: "waveform2",
		label: "Waveform 2",
		min: 0.0,
		max: 7.0,
		default: 6.0,
	},
	AlgoControlV1 {
		id: "windowFunction",
		label: "Window Function",
		min: 0.0,
		max: 5.0,
		default: 3.0,
	},
];

pub const DEFINITION: AlgoDefinitionV1 = AlgoDefinitionV1 {
	id: AlgoRefV1::Cz101,
	name: "CZ101",
	icon_path: "M4,12 L20,12",
	visible: false,
	controls: &CZ_SAW_CONTROLS,
};

pub const DEFINITION_CZ_SAW: AlgoDefinitionV1 = AlgoDefinitionV1 {
	id: AlgoRefV1::CzSaw,
	name: "CZ Saw",
	icon_path: "M4,4 L20,20",
	visible: true,
	controls: &CZ_SAW_CONTROLS,
};

pub const DEFINITION_CZ_SQUARE: AlgoDefinitionV1 = AlgoDefinitionV1 {
	id: AlgoRefV1::CzSquare,
	name: "CZ Square",
	icon_path: "M4,4 L12,4 L12,20 L20,20",
	visible: true,
	controls: &CZ_SQUARE_CONTROLS,
};

pub const DEFINITION_CZ_PULSE: AlgoDefinitionV1 = AlgoDefinitionV1 {
	id: AlgoRefV1::CzPulse,
	name: "CZ Pulse",
	icon_path: "M4,20 L8,20 L8,4 L16,4 L16,20 L20,20",
	visible: true,
	controls: &CZ_PULSE_CONTROLS,
};

pub const DEFINITION_CZ_DOUBLE_SINE: AlgoDefinitionV1 = AlgoDefinitionV1 {
	id: AlgoRefV1::CzDoubleSine,
	name: "CZ DoubleSine",
	icon_path: "M4,12 C6,4 10,4 12,12 C14,20 18,20 20,12",
	visible: true,
	controls: &CZ_DOUBLE_SINE_CONTROLS,
};

pub const DEFINITION_CZ_SAW_PULSE: AlgoDefinitionV1 = AlgoDefinitionV1 {
	id: AlgoRefV1::CzSawPulse,
	name: "CZ SawPulse",
	icon_path: "M4,20 L7,4 L9,20 L12,4 L14,20 L17,4 L20,20",
	visible: true,
	controls: &CZ_SAW_PULSE_CONTROLS,
};

pub const DEFINITION_CZ_RESO1: AlgoDefinitionV1 = AlgoDefinitionV1 {
	id: AlgoRefV1::CzReso1,
	name: "CZ Reso1",
	icon_path: "M4,18 C7,6 9,6 12,18 C15,6 17,6 20,18",
	visible: true,
	controls: &CZ_RESO1_CONTROLS,
};

pub const DEFINITION_CZ_RESO2: AlgoDefinitionV1 = AlgoDefinitionV1 {
	id: AlgoRefV1::CzReso2,
	name: "CZ Reso2",
	icon_path: "M4,18 C6,4 10,4 12,12 C14,20 18,20 20,6",
	visible: true,
	controls: &CZ_RESO2_CONTROLS,
};

pub const DEFINITION_CZ_RESO3: AlgoDefinitionV1 = AlgoDefinitionV1 {
	id: AlgoRefV1::CzReso3,
	name: "CZ Reso3",
	icon_path: "M4,12 L8,4 L12,20 L16,4 L20,12",
	visible: true,
	controls: &CZ_RESO3_CONTROLS,
};

/// CZ101 phase behavior (passthrough in warp stage).
pub fn warp_phase(phase: f32, _amt: f32) -> f32 {
	phase
}
