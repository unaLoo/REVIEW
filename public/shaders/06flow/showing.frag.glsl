#version 300 es
precision highp float;

in vec2 v_texCoord;
uniform sampler2D showingTexture;
uniform sampler2D showingTexture2;
out vec4 fragColor;

const vec3 color[10] = vec3[10](vec3(224, 249, 123) / 255.0f, vec3(233, 231, 116) / 255.0f, vec3(240, 213, 108) / 255.0f, vec3(246, 195, 101) / 255.0f, vec3(250, 176, 94) / 255.0f, vec3(253, 157, 87) / 255.0f, vec3(255, 137, 80) / 255.0f, vec3(255, 115, 73) / 255.0f, vec3(255, 90, 66) / 255.0f, vec3(255, 59, 59) / 255.0f);

const float maxV = 2.5f;
const float minV = 0.0f;

vec3 getColor(vec2 velocity) {

    float magnitude = length(velocity);
    float normalized = (magnitude - minV) / (maxV - minV);// normal
    int indexFloor = int(floor(normalized * 10.0f));
    int indexCeil = int(ceil(normalized * 10.0f));
    float factor = normalized * 10.0f - float(indexFloor);
    float roundedValue = round(factor * 10.0f) / 10.0f; 
    return mix(color[indexFloor], color[indexCeil], factor);
    // return mix(color[indexFloor], color[indexCeil], roundedValue);
}


void main() {
    float alpha = 1.0f;
    vec2 velocityUV = texture(showingTexture, v_texCoord).rg;
    if(velocityUV == vec2(0.0f)) {
        fragColor = vec4(0.0f);
        return;
    }

    vec3 velocityColor = getColor(velocityUV);
    fragColor = vec4(velocityColor, 1.0f) * alpha;
    // fragColor = vec4(velocityColor, alpha);
    // fragColor = vec4(0.5f);

}