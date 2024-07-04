#version 300 es

precision highp float;
in float opacity;

uniform float aaWidth;
uniform float fillWidth;

const float PI = 3.14159265359f;

out vec4 fragColor;

float getAlpha(float param) {
    if(aaWidth == 0.0f) {
        return 1.0f;
    } else {
        return 1.0f - sin(clamp((param * (0.5f * fillWidth + aaWidth) - 0.5f * fillWidth) / aaWidth, 0.0f, 1.0f) * 2.0f / PI);
    }
}
void main() {
    float alpha = getAlpha(opacity);
    alpha = 1.0f;
    fragColor = vec4(0.1f, 0.1f, 0.1f, 1.0f) * alpha;
}