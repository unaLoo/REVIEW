#version 300 es
precision highp float;
in vec2 param;
in vec3 color;


uniform vec3 u_color;
uniform float u_opacity;

out vec4 fragColor;

void main() {
    float alpha = 1.0f - step(1.0f, length(param));

    // fragColor = vec4(u_color/255.0f, alpha) * u_opacity;
    fragColor = vec4(color/255.0f, alpha) * u_opacity;
    
    // fragColor = vec4(1.0f, 0.0f, 0.0f, alpha);
}