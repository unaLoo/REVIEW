#ifdef VERTEX_SHADER

layout(location = 0) in vec2 a_position;

uniform float u_mapZoom;
uniform float u_exaggeration;
uniform mat4 u_matrix;
uniform sampler2D float_dem_texture;

const float MAPBOX_TILE_EXTENT = 8192.0;
const float SKIRT_OFFSET = 24575.0;

out vec2 v_uv;
out float v_height;

float calcSkirtHeight(float zoom, float exaggeration) {
    return 6 * pow(1.5, 22 - zoom) * max(1.0, exaggeration) * 1.0;
}

vec3 decomposeToPosAndSkirt(vec2 posWithComposedSkirt) {
    float skirt = float(posWithComposedSkirt.x >= SKIRT_OFFSET);
    vec2 pos = posWithComposedSkirt - vec2(skirt * SKIRT_OFFSET, 0.0);
    return vec3(pos, skirt);
}

float sampleTerrainF32Texel(vec2 uv) {
    int dim = textureSize(float_dem_texture, 0).x - 2;
    vec2 scaled_uv = (float(dim) * uv + 1.5) / (float(dim) + 2.0);
    return textureLod(float_dem_texture, scaled_uv, 0.0).r;
}

float linearSample(vec2 pos, vec2 off) {
    float tl = sampleTerrainF32Texel(pos);
    float tr = sampleTerrainF32Texel(pos + vec2(off.x, 0.0));
    float bl = sampleTerrainF32Texel(pos + vec2(0.0, off.y));
    float br = sampleTerrainF32Texel(pos + off);

    float mix_x = fract(pos.x);
    float mix_y = fract(pos.y);
    float top = mix(tl, tr, mix_x);
    float bottom = mix(bl, br, mix_x);

    return mix(top, bottom, mix_y);
}

void main() {

    vec3 pos_skirt = decomposeToPosAndSkirt(a_position);
    v_uv = clamp(pos_skirt.xy / MAPBOX_TILE_EXTENT, vec2(0.0), vec2(1.0));

    float sampleHeight = linearSample(v_uv, vec2(1.0, 1.0));
    float finalHeight = sampleHeight - pos_skirt.z * calcSkirtHeight(u_mapZoom, u_exaggeration);

    gl_Position = u_matrix * vec4(pos_skirt.xy, finalHeight, 1.0);
    v_height = finalHeight;
}

#endif

#ifdef FRAGMENT_SHADER
precision highp float;

in vec2 v_uv;
in float v_height;

out float fragColor;

void main() {
    fragColor = v_height;
}

#endif