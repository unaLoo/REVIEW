#version 300 es

in vec2 a_pos;
in vec2 a_speed;

out vec2 out_pos;

void main() {
    out_pos = vec2(a_pos + a_speed);
}