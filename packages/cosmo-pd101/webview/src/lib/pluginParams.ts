import type {
	FilterType,
	LfoTarget,
	LfoWaveform,
	LineSelect,
	ModMode,
	PolyMode,
	PortamentoMode,
	VelocityTarget,
} from "@/lib/synth/bindings/synth";

type WarpAlgoKey =
	| "cz101"
	| "bend"
	| "sync"
	| "pinch"
	| "fold"
	| "skew"
	| "quantize"
	| "twist"
	| "clip"
	| "ripple"
	| "mirror"
	| "fof"
	| "karpunk"
	| "sine";

export type EnvelopeId =
	| "l1_dco"
	| "l1_dcw"
	| "l1_dca"
	| "l2_dco"
	| "l2_dcw"
	| "l2_dca";

export const P_VOLUME = 0;
export const P_OCTAVE = 1;
export const P_LINE_SELECT = 2;
export const P_MOD_MODE = 3;
export const P_POLY_MODE = 4;
export const P_LEGATO = 5;
export const P_VEL_TARGET = 6;
export const P_INT_PM_AMOUNT = 7;
export const P_INT_PM_RATIO = 8;
export const P_PM_PRE = 10;

export const P_L1_WAVEFORM = 100;
export const P_L1_WARP_ALGO = 101;
export const P_L1_DCW_BASE = 102;
export const P_L1_DCA_BASE = 103;
export const P_L1_OCTAVE = 105;
export const P_L1_DETUNE = 106;
export const P_L1_KEY_FOLLOW = 108;
export const P_L1_ALGO_BLEND = 110;
export const P_L1_WARP_ALGO2 = 111;

export const P_L2_WAVEFORM = 200;
export const P_L2_WARP_ALGO = 201;
export const P_L2_DCW_BASE = 202;
export const P_L2_DCA_BASE = 203;
export const P_L2_OCTAVE = 205;
export const P_L2_DETUNE = 206;
export const P_L2_KEY_FOLLOW = 208;
export const P_L2_ALGO_BLEND = 210;
export const P_L2_WARP_ALGO2 = 211;

export const P_VIB_ENABLED = 300;
export const P_VIB_WAVEFORM = 301;
export const P_VIB_RATE = 302;
export const P_VIB_DEPTH = 303;
export const P_VIB_DELAY = 304;

export const P_CHORUS_MIX = 400;
export const P_CHORUS_RATE = 401;
export const P_CHORUS_DEPTH = 402;
export const P_DELAY_MIX = 500;
export const P_DELAY_TIME = 501;
export const P_DELAY_FEEDBACK = 502;
export const P_REVERB_MIX = 600;
export const P_REVERB_SIZE = 601;

export const P_LFO_ENABLED = 700;
export const P_LFO_WAVEFORM = 701;
export const P_LFO_RATE = 702;
export const P_LFO_DEPTH = 703;
export const P_LFO_TARGET = 704;

export const P_FILTER_ENABLED = 800;
export const P_FILTER_CUTOFF = 801;
export const P_FILTER_RESONANCE = 802;
export const P_FILTER_ENV_AMOUNT = 803;
export const P_FILTER_TYPE = 804;

export const P_PORT_ENABLED = 900;
export const P_PORT_MODE = 901;
export const P_PORT_TIME = 902;

type EnumToIdMap<T extends string> = Record<T, number>;

const invertMap = <T extends string>(
	input: EnumToIdMap<T>,
): Record<number, T> =>
	Object.fromEntries(
		Object.entries(input).map(([key, value]) => [value, key]),
	) as Record<number, T>;

export const LINE_SELECT_IDS: EnumToIdMap<LineSelect> = {
	"L1+L2": 0,
	L1: 1,
	L2: 2,
	"L1+L1'": 3,
	"L1+L2'": 4,
};
export const LINE_SELECT_FROM_ID = invertMap(LINE_SELECT_IDS);

export const MOD_MODE_IDS: EnumToIdMap<ModMode> = {
	normal: 0,
	ring: 1,
	noise: 2,
};
export const MOD_MODE_FROM_ID = invertMap(MOD_MODE_IDS);

export const POLY_MODE_IDS: EnumToIdMap<PolyMode> = {
	poly8: 0,
	mono: 1,
};
export const POLY_MODE_FROM_ID = invertMap(POLY_MODE_IDS);

export const VEL_TARGET_IDS: EnumToIdMap<VelocityTarget> = {
	amp: 0,
	dcw: 1,
	both: 2,
	off: 3,
};
export const VEL_TARGET_FROM_ID = invertMap(VEL_TARGET_IDS);

export const WARP_ALGO_IDS: EnumToIdMap<WarpAlgoKey> = {
	cz101: 0,
	bend: 1,
	sync: 2,
	pinch: 3,
	fold: 4,
	skew: 5,
	quantize: 6,
	twist: 7,
	clip: 8,
	ripple: 9,
	mirror: 10,
	fof: 11,
	karpunk: 12,
	sine: 13,
};
export const WARP_ALGO_FROM_ID = invertMap(WARP_ALGO_IDS);

export const LFO_WAVE_IDS: EnumToIdMap<LfoWaveform> = {
	sine: 0,
	triangle: 1,
	square: 2,
	saw: 3,
};
export const LFO_WAVE_FROM_ID = invertMap(LFO_WAVE_IDS);

export const LFO_TARGET_IDS: EnumToIdMap<LfoTarget> = {
	pitch: 0,
	dcw: 1,
	dca: 2,
	filter: 3,
};
export const LFO_TARGET_FROM_ID = invertMap(LFO_TARGET_IDS);

export const FILTER_TYPE_IDS: EnumToIdMap<FilterType> = {
	lp: 0,
	hp: 1,
	bp: 2,
};
export const FILTER_TYPE_FROM_ID = invertMap(FILTER_TYPE_IDS);

export const PORT_MODE_IDS: EnumToIdMap<PortamentoMode> = {
	rate: 0,
	time: 1,
};
export const PORT_MODE_FROM_ID = invertMap(PORT_MODE_IDS);
