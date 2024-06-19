#version 300 es

in vec2 a_pos;

void main() {
    gl_Position = vec4(a_pos, 0.0f, 1.0f);
    gl_PointSize = 10.0f;
}