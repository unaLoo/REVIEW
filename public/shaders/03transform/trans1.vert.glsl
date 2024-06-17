#version 300 es

in vec2 a_pos;

uniform vec2 u_resolution;
uniform mat3 u_matrix;

void main() {

    vec3 transfromPos = u_matrix * vec3(a_pos, 1.0f);
    vec2 pixelCenter = u_resolution / 2.0f;
    vec2 pos = (transfromPos.xy - pixelCenter) / pixelCenter;

    gl_Position = vec4(pos * vec2(1.0f, -1.0f), 0.0f, 1.0f);
}