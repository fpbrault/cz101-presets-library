use super::lerp;

/// CZ Sine-Pulse phase transfer at a given DCW amount.
pub fn warp_phase(phi: f32, dcw: f32) -> f32 {
	let dcw = dcw.clamp(0.0, 0.999);
	let p_end = lerp(1.0, 0.5, dcw);

	if p_end >= 0.999 {
		phi
	} else if phi < p_end {
		phi / p_end
	} else {
		(phi - p_end) / (1.0 - p_end)
	}
}
