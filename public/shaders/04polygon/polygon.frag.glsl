#version 300 es
precision highp float;

in vec3 v_color;
out vec4 FragColor;
void main() {
    float alpha = 0.5f;
    FragColor = vec4(v_color, alpha);
}