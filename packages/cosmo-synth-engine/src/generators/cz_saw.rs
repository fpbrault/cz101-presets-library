use super::lerp;

/// CZ Saw phase transfer at a given DCW amount.
pub fn warp_phase(phi: f32, dcw: f32) -> f32 {
	let dcw = dcw.clamp(0.0, 0.999);
	let p_peak = lerp(0.5, 0.01, dcw);

	if phi < p_peak {
		(phi / p_peak) * 0.5
	} else {
		0.5 + ((phi - p_peak) / (1.0 - p_peak)) * 0.5
	}
}
