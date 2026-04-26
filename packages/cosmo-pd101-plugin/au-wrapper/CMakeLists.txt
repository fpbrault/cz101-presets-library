cmake_minimum_required(VERSION 3.22)
project(CosmoPd101AUv2 VERSION 0.1.0 LANGUAGES C CXX OBJC OBJCXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_POSITION_INDEPENDENT_CODE ON)

# ---------------------------------------------------------------------------
# CLAP bundle location
#
# Pass -DCLAP_PATH=<absolute path to CosmoPd101.clap> when invoking cmake,
# or let the script below fall back to the debug build location.
# build-plugin.mjs sets this automatically via the --auv2 flag.
# ---------------------------------------------------------------------------
set(CLAP_PATH "" CACHE PATH "Path to the built CosmoPd101.clap bundle")

if(NOT CLAP_PATH OR NOT EXISTS "${CLAP_PATH}")
    # Fallback: look relative to workspace root
    get_filename_component(WORKSPACE_ROOT "${CMAKE_CURRENT_SOURCE_DIR}/../../.." ABSOLUTE)
    set(CLAP_PATH "${WORKSPACE_ROOT}/packages/cosmo-pd101-plugin/target/debug/CosmoPd101.clap")
endif()

if(NOT EXISTS "${CLAP_PATH}")
    message(FATAL_ERROR
        "CLAP bundle not found at '${CLAP_PATH}'.\n"
        "Run 'bun run build:plugin' first (builds VST3 + CLAP), then re-run cmake,\n"
        "or pass -DCLAP_PATH=<path> explicitly."
    )
endif()

message(STATUS "Cosmo PD-101 AUv2: using CLAP bundle at ${CLAP_PATH}")

# ---------------------------------------------------------------------------
# Fetch clap-wrapper
# ---------------------------------------------------------------------------
include(FetchContent)

# clap-wrapper requires the CLAP SDK source. Enable dependency downloading so
# local builds do not require a manually provisioned CLAP_SDK_ROOT.
set(CLAP_WRAPPER_DOWNLOAD_DEPENDENCIES TRUE CACHE BOOL "Download clap-wrapper SDK deps" FORCE)

FetchContent_Declare(
    clap-wrapper
    GIT_REPOSITORY https://github.com/free-audio/clap-wrapper.git
    GIT_TAG        main
    GIT_SHALLOW    TRUE
)
FetchContent_MakeAvailable(clap-wrapper)

# ---------------------------------------------------------------------------
# AUv2 wrapper target
#
# Manufacturer code: "Cosm" (4 chars, registered with Apple)
# Subtype code:      "PD01" (4 chars, unique to this plugin)
# Instrument type:   "aumu" — virtual instrument (not an effect)
# CLAP plugin ID:    jp.cosmo.pd101 (must match CzPlugin::CLAP_ID in lib.rs)
# ---------------------------------------------------------------------------
add_library(CosmoPd101AUv2 MODULE)

target_add_auv2_wrapper(
    TARGET               CosmoPd101AUv2
    OUTPUT_NAME          "CosmoPd101"
    BUNDLE_IDENTIFIER    "jp.cosmo.pd101.auv2"
    BUNDLE_VERSION       "0.1.0"
    MANUFACTURER_NAME    "Cosmo"
    MANUFACTURER_CODE    "Cosm"
    SUBTYPE_CODE         "PD01"
    INSTRUMENT_TYPE      "aumu"
    MACOS_EMBEDDED_CLAP_LOCATION "${CLAP_PATH}"
)
