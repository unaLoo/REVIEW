#version 300 es

in vec2 a_pos;

uniform mat4 u_matrix;
uniform sampler2D u_inputTile;
uniform vec3 u_tileInfo;
uniform float u_exaggeration;

out vec2 v_uv;
out float isSkirt;

const float MAPBOX_TILE_EXTENT = 8192.0f;
const float SKIRT_OFFSET = 24575.0f;

vec3 decomposeToPosAndSkirt(vec2 posWithComposedSkirt) {
    float skirt = float(posWithComposedSkirt.x >= SKIRT_OFFSET);
    vec2 pos = posWithComposedSkirt - vec2(skirt * SKIRT_OFFSET, 0.0f);
    return vec3(pos, skirt);
}

vec3 getElevation(vec2 apos) {
    int dim = textureSize(u_inputTile, 0).x - 2;
    vec2 pos = (float(dim) * (apos / 8192.0f * 1.0f + 0.0f) + 1.5f) / (float(dim) + 2.0f);
    return texture(u_inputTile, pos).rgb;
}

void main() {

    vec3 pos_skirt = decomposeToPosAndSkirt(a_pos);
    vec2 pos = pos_skirt.xy;
    float skirt = pos_skirt.z;

    v_uv = clamp(vec2(pos.x, pos.y) / MAPBOX_TILE_EXTENT, vec2(0.0f), vec2(1.0f));

    vec3 rgb = texture(u_inputTile, v_uv).rgb;
    // vec3 rgb = getElevation(pos);

    // mapbox rgb to elevation
    // float m_elevation = -10000.0f + ((rgb.x * 256.0f * 256.0f * 256.0f + rgb.y * 256.0f * 256.0f + rgb.z * 256.0f) * 0.1f);
    // float height = m_elevation * 5.0f;

    // local height map
    // float height = rgb.x * u_exaggeration;
    float height = -(1.0f - rgb.x) * u_exaggeration;
    // float height = m_elevation * 10.0f + skirt * mod(float(gl_VertexID), 100.0f);
    // float height = 1.0f;

    isSkirt = skirt;
    // gl_Position = u_matrix * vec4(a_pos.xy, m_elevation + skirt * mod(float(gl_VertexID), 100.0f), 1.0f);
    // gl_Position = u_matrix * vec4(a_pos.xy, 0.0, 1.0f);
    gl_Position = u_matrix * vec4(pos.xy, height, 1.0f);

    gl_PointSize = 5.0f;

}
