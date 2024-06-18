#version 300 es
precision highp float;

in vec2 v_texCoord;
uniform sampler2D uv_texture;
out vec4 fragColor;

void main() {
    float alpha = 0.8f;
    vec2 velocityUV = texture(uv_texture, v_texCoord).rg;
    fragColor = vec4(velocityUV, 0.0, alpha);
    // fragColor = vec4(0.0)*alpha;
}