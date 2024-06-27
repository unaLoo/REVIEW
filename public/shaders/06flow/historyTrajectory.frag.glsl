#version 300 es
precision highp float;

uniform sampler2D showTexture;
in vec2 v_texcoord;

out vec4 fragColor;

const float fadeFactor = 0.99f;

void main() {
    vec4 color = texture(showTexture, v_texcoord);
    fragColor = color * fadeFactor;
}