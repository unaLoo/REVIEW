#version 300 es
precision highp float;

uniform sampler2D showTexture;
uniform float fadeFactor;
in vec2 v_texCoord;

out vec4 fragColor;


void main() {
    vec4 color = texture(showTexture, v_texCoord);
    fragColor = color * fadeFactor;
}