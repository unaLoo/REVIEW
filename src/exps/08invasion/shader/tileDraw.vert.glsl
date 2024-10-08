#version 300 es

in vec2 a_pos;
in vec2 a_uv;

uniform mat4 u_matrix;
uniform sampler2D u_inputTile;
uniform vec3 u_tileInfo;
uniform float u_exaggeration;

out vec2 v_uv;

const float MAPBOX_TILE_EXTENT = 8192.0f;

void main() {

    // v_uv = vec2(a_uv.x, 1.0f - a_uv.y);
    // v_uv = clamp(vec2(a_uv.x, 1.0f - a_uv.y), vec2(0.001f), vec2(0.999f));
    v_uv = clamp(vec2(a_uv.x, 1.0f - a_uv.y), vec2(0.0f), vec2(1.0f));

    vec3 rgb = texture(u_inputTile, v_uv).rgb;
    // float height = -(1.0f - rgb.x) * u_exaggeration;
    float height = (rgb.x) * u_exaggeration;

    gl_Position = u_matrix * vec4(a_pos.xy * MAPBOX_TILE_EXTENT, height, 1.0f);
    gl_PointSize = 3.0f;
}
