use super::lerp;

/// CZ Square phase transfer at a given DCW amount.
pub fn warp_phase(phi: f32, dcw: f32) -> f32 {
	let dcw = dcw.clamp(0.0, 0.999);
	let p_peak = lerp(0.5, 0.01, dcw);
	let p_fall = lerp(1.0, 0.51, dcw);

	if phi < p_peak {
		(phi / p_peak) * 0.5
	} else if phi < 0.5 {
		0.5
	} else if phi < p_fall {
		0.5 + ((phi - 0.5) / (p_fall - 0.5)) * 0.5
	} else {
		1.0
	}
}
