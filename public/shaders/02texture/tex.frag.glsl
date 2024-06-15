#version 300 es

precision highp float;

in vec2 v_texCoord;

uniform sampler2D myTexture;

out vec4 outColor;

void main() {
    // outColor = texture(myTexture, v_texCoord).rgba;
    vec4 center = texture(myTexture, v_texCoord).rgba;
    vec4 up = texture(myTexture, v_texCoord + vec2(0.0f, 1.0f));
    vec4 but = texture(myTexture, v_texCoord + vec2(0.0f, -1.0f));
    vec4 left = texture(myTexture, v_texCoord + vec2(1.0f, -0.0f));
    vec4 right = texture(myTexture, v_texCoord + vec2(-1.0f, -0.0f));
    // outColor = (center + up + but + left + right) / 5.0f;   
    // outColor = (center + left + right) / 3.0f;
    outColor = center;   

}