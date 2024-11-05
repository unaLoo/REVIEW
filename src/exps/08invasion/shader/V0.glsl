
#ifdef VERTEX_SHADER

layout(location = 0) in vec2 a_position;

uniform mat4 u_matrix;
uniform sampler2D float_dem_texture;
uniform vec2 u_dem_tl;
uniform float u_dem_size;
uniform float u_dem_scale;
uniform float u_skirt_height;
uniform float u_exaggeration;

const float MAPBOX_TILE_EXTENT = 8192.0;
const float SKIRT_OFFSET = 24575.0;
const float SKIRT_HEIGHT = 1000.0;

out vec2 v_uv;
out float v_height;
out float v_skirt;

vec4 tileUvToDemSample(vec2 uv, float dem_size, float dem_scale, vec2 dem_tl) {
    vec2 pos = dem_size * (uv * dem_scale + dem_tl) + 1.0;// 1 -- 513
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

    return u_exaggeration * mix(mix(tl, tr, f.x), mix(bl, br, f.x), f.y);

}

vec3 decomposeToPosAndSkirt(vec2 posWithComposedSkirt) {
    float skirt = float(posWithComposedSkirt.x >= SKIRT_OFFSET);
    vec2 pos = posWithComposedSkirt - vec2(skirt * SKIRT_OFFSET, 0.0);
    return vec3(pos, skirt);
}

void main() {

    vec3 pos_skirt = decomposeToPosAndSkirt(a_position);
    vec2 pos = pos_skirt.xy;
    float skirt = pos_skirt.z;

    float height = elevation(pos) - skirt * (10000.0);

    gl_Position = u_matrix * vec4(pos.xy, height, 1.0);
    v_height = height;
    v_skirt = skirt;

}
#endif

#ifdef FRAGMENT_SHADER
precision highp float;

in vec2 v_uv;
in float v_height;
in float v_skirt;

uniform sampler2D float_dem_texture;

out vec4 outColor;

const float opacity = 0.5;

void main() {

    // if(v_skirt > 0.0) {
    //     return;
    // }

    outColor = vec4((v_height / 30.0 + 60.0) / 70.0, 0.4, 0.45, 1.0);
    // outColor = texture(float_dem_texture, v_uv);
    // outColor = vec4(texture(float_dem_texture, v_uv).rgb, 0.5);
    // outColor = vec4(0.0, 0.5, 0.5, 1.0) * opacity;
}
#endif