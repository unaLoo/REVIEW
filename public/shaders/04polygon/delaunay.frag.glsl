#version 300 es
precision highp float;

in vec2 v_velocity;

out vec4 fragColor;

void main() {
    fragColor = vec4(v_velocity, 0.0f, 1.0f);
    // fragColor = vec4(1.0f, 0.0f, 0.0f, 1.0f);
}