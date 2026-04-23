use serde::{Deserialize, Serialize};
#[cfg(feature = "specta-bindings")]
use specta::Type;

pub use crate::generators::CzPresetV1;
use crate::generators::{self, AlgoDefinitionV1, AlgoUiEntryV1, CZ_PRESETS};
use crate::params::SynthParams;

pub const SYNTH_SCHEMA_VERSION_V1: u16 = 1;

fn default_schema_version_v1() -> u16 {
    SYNTH_SCHEMA_VERSION_V1
}

/// Canonical, versioned synth preset wire contract.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "specta-bindings", derive(Type))]
#[serde(rename_all = "camelCase")]
pub struct SynthPresetV1 {
    #[serde(default = "default_schema_version_v1")]
    pub schema_version: u16,
    pub params: SynthParams,
}

impl Default for SynthPresetV1 {
    fn default() -> Self {
        Self {
            schema_version: SYNTH_SCHEMA_VERSION_V1,
            params: SynthParams::default(),
        }
    }
}

pub fn algo_ui_catalog_v1() -> &'static [AlgoUiEntryV1] {
    generators::algo_ui_catalog_v1()
}

pub fn algo_definitions_v1() -> &'static [AlgoDefinitionV1] {
    generators::algo_definitions_v1()
}

pub fn cz_presets() -> &'static [CzPresetV1] {
    &CZ_PRESETS
}
