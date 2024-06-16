#version 300 es

precision highp float;

uniform sampler2D myTexture;
uniform float u_kernel[9];
uniform float u_kernelWeight;

in vec2 v_uv;
out vec4 fragColor;

void main() {
    vec2 onePixel = vec2(1) / vec2(textureSize(myTexture, 0));
    vec4 colorSum = 
        texture(myTexture, v_uv + onePixel * vec2(-1, -1)) * u_kernel[0] +
        texture(myTexture, v_uv + onePixel * vec2(0, -1)) * u_kernel[1] +
        texture(myTexture, v_uv + onePixel * vec2(1, -1)) * u_kernel[2] +
        texture(myTexture, v_uv + onePixel * vec2(-1, 0)) * u_kernel[3] +
        texture(myTexture, v_uv + onePixel * vec2(0, 0)) * u_kernel[4] +
        texture(myTexture, v_uv + onePixel * vec2(1, 0)) * u_kernel[5] +
        texture(myTexture, v_uv + onePixel * vec2(-1, 1)) * u_kernel[6] +
        texture(myTexture, v_uv + onePixel * vec2(0, 1)) * u_kernel[7] +
        texture(myTexture, v_uv + onePixel * vec2(1, 1)) * u_kernel[8];

    fragColor = vec4((colorSum / u_kernelWeight).rgb, 1);

}