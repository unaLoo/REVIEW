#version 300 es

precision highp float;

in vec2 v_texCoord;

uniform sampler2D myTexture;

out vec4 outColor;

void main() {
    outColor = texture(myTexture, v_texCoord);
}