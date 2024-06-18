#version 300 es
precision highp float;

in vec3 v_color;
out vec4 fragColor;

void main() {
    float alpha = 0.8;
    fragColor = vec4(v_color, alpha);
}