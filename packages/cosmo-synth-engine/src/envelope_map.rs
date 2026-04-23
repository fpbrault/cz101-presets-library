/// CZ-101 envelope kind — determines which conversion formula to use.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum EnvelopeKind {
    Dco,
    Dcw,
    Dca,
}

#[inline]
fn trunc_div(num: u32, den: u32) -> u8 {
    (num / den) as u8
}

/// Convert a human-readable rate value [0, 99] to the internal raw rate [0, 127].
#[inline]
pub fn human_rate_to_raw(kind: EnvelopeKind, human: u8) -> u8 {
    let a = human.min(99) as u32;
    match kind {
        EnvelopeKind::Dco => trunc_div(a * 127, 99),
        EnvelopeKind::Dcw => trunc_div(a * 119, 99) + 8,
        EnvelopeKind::Dca => trunc_div(a * 119, 99),
    }
}

/// Convert an internal raw rate [0, 127] back to human [0, 99].
#[inline]
pub fn raw_rate_to_human(kind: EnvelopeKind, raw: u8) -> u8 {
    let b = raw.min(127) as u32;
    match kind {
        EnvelopeKind::Dco => {
            if b == 0 {
                0
            } else if b == 127 {
                99
            } else {
                trunc_div(b * 99, 127) + 1
            }
        }
        EnvelopeKind::Dcw => {
            if b <= 8 {
                0
            } else if b >= 127 {
                99
            } else {
                trunc_div((b - 8) * 99, 119) + 1
            }
        }
        EnvelopeKind::Dca => {
            if b == 0 {
                0
            } else if b >= 119 {
                99
            } else {
                trunc_div(b * 99, 119) + 1
            }
        }
    }
}

/// Convert a human-readable level value [0, 99] to the internal raw level [0, 127].
#[inline]
pub fn human_level_to_raw(kind: EnvelopeKind, human: u8) -> u8 {
    let a = human.min(99);
    match kind {
        EnvelopeKind::Dco => {
            if a > 63 {
                a.saturating_add(4)
            } else {
                a
            }
        }
        EnvelopeKind::Dcw => trunc_div((a as u32) * 127, 99),
        EnvelopeKind::Dca => {
            if a == 0 {
                0
            } else {
                a.saturating_add(28)
            }
        }
    }
}

/// Convert an internal raw level [0, 127] back to human [0, 99].
#[inline]
pub fn raw_level_to_human(kind: EnvelopeKind, raw: u8) -> u8 {
    let b = raw.min(127);
    match kind {
        EnvelopeKind::Dco => {
            if b > 63 {
                b.saturating_sub(4)
            } else {
                b
            }
        }
        EnvelopeKind::Dcw => {
            if b == 0 {
                0
            } else if b == 127 {
                99
            } else {
                trunc_div((b as u32) * 99, 127) + 1
            }
        }
        EnvelopeKind::Dca => {
            if b == 0 {
                0
            } else {
                b.saturating_sub(28)
            }
        }
    }
}
