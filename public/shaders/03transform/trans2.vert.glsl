#version 300 es

in vec3 a_pos;
in vec3 a_color;

uniform vec2 u_resolution;
uniform mat4 u_matrix;

out vec3 v_color;

void main() {

    // vec4 transfromPos = u_matrix * vec4(a_pos, 1.0f);
    // vec2 pixelCenter = u_resolution / 2.0f;
    // vec2 pos = (transfromPos.xy - pixelCenter) / pixelCenter;

    // gl_Position = vec4(pos * vec2(1.0f, -1.0f), transfromPos.zw);

    v_color = a_color / 255.0;
    gl_Position = u_matrix * vec4(a_pos, 1.0f);

}