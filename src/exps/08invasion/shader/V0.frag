#version 300 es
precision highp float;

in vec2 v_uv;
in float v_height;

uniform sampler2D float_dem_texture;

out vec4 outColor;

const float opacity = 0.5f;

void main(){

    // outColor = texture(float_dem_texture, v_uv);
    // outColor = vec4(texture(float_dem_texture, v_uv).rgb, 0.5);
    outColor = vec4(0.0,0.5f,0.5f,1.0f) * opacity;
}