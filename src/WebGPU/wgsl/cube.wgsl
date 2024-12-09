struct VertexInput {
    @location(0) position: vec4f,
    @location(1) normal: vec3f,
    @location(2) texcoord: vec2f
}
struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) normal: vec3f,
    @location(1) texcoord: vec2f,
    @location(2) worldpos: vec4f
}
struct FragmentInput {
    @builtin(position) fragcoord: vec4f,
    @location(0) normal: vec3f,
    @location(1) texcoord: vec2f,
    @location(2) worldpos: vec4f
}
struct FragmentOutput {
    @location(0) fragColor: vec4f,
}

struct VSUniforms {
    modelMat: mat4x4f,
    viewMat: mat4x4f,
    projMat: mat4x4f,
    normalMat: mat4x4f
}
struct FSUniforms {
    lightPos: vec3f
}

/////// Uniforms
@group(0) @binding(0) var<uniform> vsUniform: VSUniforms;
@group(0) @binding(1) var<uniform> fsUniform: FSUniforms;
////// Samplers and Textures
@group(0) @binding(2) var diffuseSampler: sampler;
@group(0) @binding(3) var diffuseTexture: texture_2d<f32>;





@vertex 
fn v_main( vertexInput: VertexInput) -> VertexOutput 
{
    var mvpMat = vsUniform.projMat * vsUniform.viewMat * vsUniform.modelMat;

    var vertexOutput: VertexOutput;
    vertexOutput.position = mvpMat * vertexInput.position;
    vertexOutput.normal = (vsUniform.normalMat * vec4(vertexInput.normal, 0.0)).xyz;
    vertexOutput.texcoord = vertexInput.texcoord;
    vertexOutput.worldpos = vertexInput.position;
    return vertexOutput;
}



@fragment 
fn f_main( fragInput: FragmentInput) -> FragmentOutput
{
    // var white = vec3(1.0,1.0,1.0);
    // var black = vec3(0.0,0.0,0.0);

    // let gridIndex = vec2u(fragInput.fragcoord.xy) / 16;
    // let checker = (gridIndex.x + gridIndex.y) % 2;
    // let color = select(white, black, checker == 0);

    // var output: FragmentOutput;
    // output.fragColor = vec4f(color, 1.0);

    // return output;

    var diffuseColor = textureSample(diffuseTexture, diffuseSampler, fragInput.texcoord);
    var normalVec = normalize(fragInput.normal);
    var lightDir = normalize(fsUniform.lightPos - fragInput.worldpos.xyz);
    var light = dot(normalVec, fsUniform.lightPos) * 0.5 + 0.5;

    var fragOutput: FragmentOutput;
    fragOutput.fragColor = vec4f(diffuseColor.rgb * light, diffuseColor.a);
    return fragOutput;
}
