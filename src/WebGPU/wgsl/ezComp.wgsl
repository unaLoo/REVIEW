
@group(0) @binding(0) var<storage,read_write> data: array<f32>;

@compute @workgroup_size(1)
fn c_main(
    @builtin(global_invocation_id) id: vec3u
){
    let i:u32 = id.x;
    data[i] = data[i] * 2.0;
}