#version 300 es
precision highp float;

in float velocity;
in float opacity;
uniform float maxSpeed;
uniform float aaWidth;
uniform float fillWidth;

const float PI = 3.14159265359f;

out vec4 fragColor;

const vec3 color[10] = vec3[10](vec3(224, 249, 123) / 255.0f, vec3(233, 231, 116) / 255.0f, vec3(240, 213, 108) / 255.0f, vec3(246, 195, 101) / 255.0f, vec3(250, 176, 94) / 255.0f, vec3(253, 157, 87) / 255.0f, vec3(255, 137, 80) / 255.0f, vec3(255, 115, 73) / 255.0f, vec3(255, 90, 66) / 255.0f, vec3(255, 59, 59) / 255.0f);

vec3 getColor(float v) {
    if(v == 0.0f) {
        return vec3(224, 249, 123);
    }
        
    float normalV = v / maxSpeed;
    int ceilIndex = int(ceil(normalV * 10.0f));
    int floorIndex = int(floor(normalV * 10.0f));
    float interval = (normalV * 10.0f) - floor(normalV * 10.0f);
    return mix(color[floorIndex], color[ceilIndex], interval);
}

float getAlpha(float param) {
    if(aaWidth == 0.0f) {
        return 1.0f;
    } else {
        return 1.0f - sin(clamp((param * (0.5f * fillWidth + aaWidth) - 0.5f * fillWidth) / aaWidth, 0.0f, 1.0f) * 2.0f / PI);
    }
}

void main() {
    float alpha = getAlpha(opacity);
    vec3 color = getColor(velocity);
    fragColor = vec4(color, 1.0f) * alpha;
    // fragColor = vec4(1.0,0.0,0.0,1.0);
}