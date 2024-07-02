#version 300 es
precision highp float;
in vec2 param;
uniform vec3 u_color;
out vec4 fragColor;
void main() {
    float alpha = 1.0f - step(1.0f, length(param));
    fragColor = vec4(u_color, 1.0f) * alpha;
    // fragColor = vec4(1.0f, 0.0f, 0.0f, alpha);
}