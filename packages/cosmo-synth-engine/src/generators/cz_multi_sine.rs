use super::{lerp, wrap01};

/// CZ MultiSine (resonance) phase transfer at a given DCW amount.
pub fn warp_phase(phi: f32, dcw: f32) -> f32 {
	let dcw = dcw.clamp(0.0, 0.999);
	wrap01(phi * lerp(1.0, 15.0, dcw))
}
