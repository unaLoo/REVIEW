
#ifdef VERTEX_SHADER

layout(location = 0) in vec2 a_position;

uniform mat4 u_matrix;
uniform sampler2D float_dem_texture;
uniform vec2 u_dem_tl;
uniform float u_dem_size;
uniform float u_dem_scale;
uniform float u_skirt_height;

const float MAPBOX_TILE_EXTENT = 8192.0;
const float SKIRT_OFFSET = 24575.0;
const float Exaggeration = -30.0;

out vec2 v_uv;
out float v_height;

vec4 tileUvToDemSample(vec2 uv, float dem_size, float dem_scale, vec2 dem_tl) {
    vec2 pos = dem_size * (uv * dem_scale + dem_tl) + 1.0;
    vec2 f = fract(pos);
    return vec4((pos - f + 0.5) / (dem_size + 2.0), f);
}

float elevation(vec2 apos) {

    float dd = 1.0 / (u_dem_size + 2.0);
    vec4 r = tileUvToDemSample(apos / 8192.0, u_dem_size, u_dem_scale, u_dem_tl);
    vec2 pos = r.xy;
    vec2 f = r.zw;

    float tl = texture(float_dem_texture, pos).r;
    float tr = texture(float_dem_texture, pos + vec2(dd, 0)).r;
    float bl = texture(float_dem_texture, pos + vec2(0, dd)).r;
    float br = texture(float_dem_texture, pos + vec2(dd, dd)).r;

    return Exaggeration * mix(mix(tl, tr, f.x), mix(bl, br, f.x), f.y) - 100.0;

}

vec3 decomposeToPosAndSkirt(vec2 posWithComposedSkirt) {
    float skirt = float(posWithComposedSkirt.x >= SKIRT_OFFSET);
    vec2 pos = posWithComposedSkirt - vec2(skirt * SKIRT_OFFSET, 0.0);
    return vec3(pos, skirt);
}

// vec2 uvCorrection(vec2 uv, vec2 dim) {
//     return clamp(uv, vec2(0.0), dim - vec2(1.0));
// }

// float decodeFromTerrainRGB(vec3 rgb) {

//     vec3 RGB = rgb * 255.0;
//     float height = -10000.0 + ((RGB.r * 256.0 * 256.0 + RGB.g * 256.0 + RGB.b) * 0.1);
//     return height;
// }

// vec3 sampleTerrainRGBTexel(vec2 uv) {
//     int dim = textureSize(float_dem_texture, 0).x - 2;
//     vec2 scaled_uv = (float(dim) * uv + 1.5) / (float(dim) + 2.0);
//     return texture(float_dem_texture, scaled_uv).rgb;
// }

// float sampleTerrainF32Texel(vec2 uv) {
//     int dim = textureSize(float_dem_texture, 0).x - 2;
//     vec2 scaled_uv = (float(dim) * uv + 1.5) / (float(dim) + 2.0);
//     return texture(float_dem_texture, scaled_uv).r;
// }

// float linearSamplingTerrainRGB(sampler2D texture, vec2 uv, vec2 dim) {

//     vec2 offsets[4] = vec2[](vec2(0.0, 0.0), vec2(1.0, 0.0), vec2(0.0, 1.0), vec2(1.0, 1.0));

//     float tl = decodeFromTerrainRGB(sampleTerrainRGBTexel(uvCorrection(uv + offsets[0], dim) / dim));
//     float tr = decodeFromTerrainRGB(sampleTerrainRGBTexel(uvCorrection(uv + offsets[1], dim) / dim));
//     float bl = decodeFromTerrainRGB(sampleTerrainRGBTexel(uvCorrection(uv + offsets[2], dim) / dim));
//     float br = decodeFromTerrainRGB(sampleTerrainRGBTexel(uvCorrection(uv + offsets[3], dim) / dim));
//     float mix_x = fract(uv.x);
//     float mix_y = fract(uv.y);
//     float top = mix(tl, tr, mix_x);
//     float bottom = mix(bl, br, mix_x);
//     return mix(top, bottom, mix_y);
// }

void main() {

    vec3 pos_skirt = decomposeToPosAndSkirt(a_position);
    vec2 pos = pos_skirt.xy;
    float skirt = pos_skirt.z;

    float height = elevation(pos) - skirt * u_skirt_height;

    gl_Position = u_matrix * vec4(pos.xy, height, 1.0);
    v_height = height;

}
#endif

#ifdef FRAGMENT_SHADER
precision highp float;

in vec2 v_uv;
in float v_height;

uniform sampler2D float_dem_texture;

out vec4 outColor;

const float opacity = 0.5;

void main() {

    // outColor = texture(float_dem_texture, v_uv);
    // outColor = vec4(texture(float_dem_texture, v_uv).rgb, 0.5);
    outColor = vec4(0.0, 0.5, 0.5, 1.0) * opacity;
}
#endif