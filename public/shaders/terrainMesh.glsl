
#ifdef VERTEX_SHADER

layout(location = 0) in vec2 a_position;

uniform mat4 u_matrix;
uniform mat4 u_modelMatrix;
uniform float u_skirt_height;
uniform float u_exaggeration;
uniform float u_dem_scale;
uniform vec2 u_dem_tl;
uniform sampler2D float_dem_texture;

const float MAPBOX_TILE_EXTENT = 8192.0f;
const float SKIRT_OFFSET = 24575.0f;

out float v_height;
out vec3 v_normal;

vec3 decomposeToPosAndSkirt(vec2 posWithComposedSkirt) {
    float skirt = float(posWithComposedSkirt.x >= SKIRT_OFFSET);
    vec2 pos = posWithComposedSkirt - vec2(skirt * SKIRT_OFFSET, 0.0f);
    return vec3(pos, skirt);
}

vec2 uvCorrection(vec2 uv) {
    return clamp(uv, vec2(0.0), vec2(1.0));
}

float sampleTerrainF32Texel(vec2 uv, vec2 dim) {
    
    vec2 _uv = uvCorrection(uv);
    vec2 scaled_uv = (dim * _uv + 1.5f) / (dim + 2.0f);
    return texture(float_dem_texture, scaled_uv).r;
}

float linearSamplingF32TerrainHeight(vec2 uv, vec2 dim, float tl, float tr, float bl, float br) {

    float mix_x = fract(uv.x * dim.x);
    float mix_y = fract(uv.y * dim.y);
    float top = mix(tl, tr, mix_x);
    float bottom = mix(bl, br, mix_x);
    return mix(top, bottom, mix_y);
}

void main(){

    vec3 pos_skirt = decomposeToPosAndSkirt(a_position);
    vec2 pos = pos_skirt.xy;
    float skirt = pos_skirt.z;

    vec2 uv = clamp(vec2(pos.x, pos.y) / MAPBOX_TILE_EXTENT * u_dem_scale + u_dem_tl, vec2(0.0f), vec2(1.0f));
    vec2 dim = vec2(textureSize(float_dem_texture, 0)) - 2.0;

    vec2 offsets[4] = vec2[](vec2(0.0, 0.0),vec2(1.0, 0.0),vec2(0.0, 1.0),vec2(1.0, 1.0));

    float tl = sampleTerrainF32Texel(uv + offsets[0] / dim, dim);
    float tr = sampleTerrainF32Texel(uv + offsets[1] / dim, dim); // E
    float bl = sampleTerrainF32Texel(uv + offsets[2] / dim, dim); // N
    float br = sampleTerrainF32Texel(uv + offsets[3] / dim, dim);
    float eS = sampleTerrainF32Texel(uv + vec2(0.0, -1.0) / dim, dim); // S
    float eW = sampleTerrainF32Texel(uv + vec2(-1.0, 0.0) / dim, dim); // W
    float height = linearSamplingF32TerrainHeight(uv, dim, tl, tr, bl, br);

    vec3 dx = normalize(vec3(1.0, 0.0, tr - eW));
    vec3 dy = normalize(vec3(0.0, 1.0, bl - eS));

    float z = 30.0 * height - skirt * 10000.0;
    gl_Position = u_matrix * u_modelMatrix * vec4(pos.xy, z, 1.0);
    v_normal = normalize(cross(dx, dy));
    v_height = height;
}
#endif


#ifdef FRAGMENT_SHADER
precision highp float;

in float v_height;
in vec3 v_normal;

uniform sampler2D float_dem_texture;

out vec4 outColor;

void main(){

    outColor = vec4(v_height, v_normal);
}
#endif