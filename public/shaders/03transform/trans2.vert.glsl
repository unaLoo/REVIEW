#version 300 es

in vec3 a_pos;

uniform vec2 u_resolution;
uniform mat4 u_matrix;

void main() {

    // vec4 transfromPos = u_matrix * vec4(a_pos, 1.0f);
    // vec2 pixelCenter = u_resolution / 2.0f;
    // vec2 pos = (transfromPos.xy - pixelCenter) / pixelCenter;

    // gl_Position = vec4(pos * vec2(1.0f, -1.0f), transfromPos.zw);

    gl_Position = u_matrix * vec4(a_pos, 1.0f);

}