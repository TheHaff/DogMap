use std::env;
use std::path::PathBuf;

fn main() {
    let out_dir = PathBuf::from(env::var("OUT_DIR").unwrap());
    
    // Generate protobuf code from the .proto file
    prost_build::Config::new()
        .out_dir(&out_dir)
        .compile_protos(&["../src/protobuf/messages.proto"], &["../src/protobuf"])
        .unwrap();
    
    // Tell cargo to rerun this build script if the .proto file changes
    println!("cargo:rerun-if-changed=../src/protobuf/messages.proto");
} 