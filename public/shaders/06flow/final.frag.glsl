#version 300 es
precision highp float;

uniform sampler2D showTexture;

in vec2 v_texCoord;
out vec4 fragColor;

void main() {
    fragColor = texture(showTexture, v_texCoord) * 0.6f;
}