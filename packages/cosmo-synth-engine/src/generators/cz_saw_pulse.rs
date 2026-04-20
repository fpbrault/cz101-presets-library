use super::lerp;

/// CZ Saw-Pulse phase transfer at a given DCW amount.
pub fn warp_phase(phi: f32, dcw: f32) -> f32 {
	let dcw = dcw.clamp(0.0, 0.999);
	let p_peak = lerp(0.5, 0.01, dcw);
	let p_end = lerp(1.0, 0.5, dcw);

	if phi < p_peak {
		(phi / p_peak) * 0.5
	} else if phi < p_end {
		0.5 + ((phi - p_peak) / (p_end - p_peak)) * 0.5
	} else {
		1.0
	}
}
