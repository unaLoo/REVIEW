#version 300 es
precision highp float;

in float velocity;
uniform float maxSpeed;

out vec4 fragColor;

const vec3 color[10] = vec3[10](vec3(224, 249, 123) / 255.0f, vec3(233, 231, 116) / 255.0f, vec3(240, 213, 108) / 255.0f, vec3(246, 195, 101) / 255.0f, vec3(250, 176, 94) / 255.0f, vec3(253, 157, 87) / 255.0f, vec3(255, 137, 80) / 255.0f, vec3(255, 115, 73) / 255.0f, vec3(255, 90, 66) / 255.0f, vec3(255, 59, 59) / 255.0f);

vec3 getColor(float v) {
    float normalV = v / maxSpeed;
    int ceilIndex = int(ceil(normalV * 10.0f));
    int floorIndex = int(floor(normalV * 10.0f));
    float interval = (normalV * 10.0f) - floor(normalV * 10.0f);
    return mix(color[floorIndex], color[ceilIndex], interval);
}

void main() {
    float alpha = 0.9f;
    vec3 color = getColor(velocity);
    // fragColor = vec4(color, 1.0f) * alpha;
    fragColor = vec4(1.0,0.0,0.0,1.0);
}