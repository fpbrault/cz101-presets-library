fn main() {
    // Re-run this build script (and thus recompile the crate) when the custom
    // URL scheme or the ObjC class prefix changes between builds.
    println!("cargo:rerun-if-env-changed=WRY_CUSTOM_SCHEME");
    println!("cargo:rerun-if-env-changed=WRY_OBJC_CLASS_PREFIX");
}
