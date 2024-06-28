#version 300 es
precision highp float;

uniform sampler2D showTexture;
uniform sampler2D uv_texture;
uniform float fadeFactor;

in vec2 v_texCoord;

out vec4 fragColor;

void main() {
    vec4 color = texture(showTexture, v_texCoord);
    vec2 uv = texture(uv_texture, v_texCoord).rg;
    if(uv == vec2(0.0f)) {
        fragColor = vec4(0.0f, 0.0f, 0.0f, 0.0f);
    } else {
        fragColor = color * fadeFactor;
    }
    
}