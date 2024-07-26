#version 300 es
precision highp float;

in vec2 v_texCoord;
uniform sampler2D showingTexture;
uniform sampler2D mask;
out vec4 fragColor;

// const vec3 color[10] = vec3[10](vec3(0.0f, 0.0f, 1.0f),   // 蓝色
// vec3(0.0f, 0.5f, 1.0f),   // 浅蓝色
// vec3(0.0f, 1.0f, 1.0f),   // 青色
// vec3(0.0f, 1.0f, 0.5f),   // 浅青色
// vec3(0.0f, 1.0f, 0.0f),   // 绿色
// vec3(0.5f, 1.0f, 0.0f),   // 浅绿色
// vec3(1.0f, 1.0f, 0.0f),   // 黄色
// vec3(1.0f, 0.5f, 0.0f),   // 浅黄色
// vec3(1.0f, 0.0f, 0.0f),   // 红色
// vec3(0.5f, 0.0f, 0.0f)    // 深红色
// );
const vec3 color[10] = vec3[10](vec3(66, 118, 250), vec3(108, 140, 252), vec3(141, 163, 253), vec3(171, 186, 254), vec3(200, 209, 254), vec3(249, 195, 196), vec3(254, 166, 166), vec3(255, 137, 135), vec3(254, 105, 103), vec3(249, 67, 70));
const float maxV = 2.5f;
const float minV = 0.0f;

vec3 getColor(vec2 velocity) {

    float magnitude = length(velocity);
    float normalized = (magnitude - minV) / (maxV - minV);// normal
    int indexFloor = int(floor(normalized * 10.0f));
    int indexCeil = int(ceil(normalized * 10.0f));
    float factor = normalized * 10.0f - float(indexFloor);
    float roundedValue = round(factor * 10.0f) / 10.0f;
    // return mix(color[indexFloor], color[indexCeil], factor);
    return factor > 0.5f ? color[indexCeil] : color[indexFloor];
}

void main() {

    // show flow texture
    float alpha = 0.8f;
    vec2 velocityUV = texture(showingTexture, v_texCoord).rg;
    if(velocityUV == vec2(0.0f)) {
        fragColor = vec4(0.0f);
        return;
    }

    vec3 velocityColor = getColor(velocityUV) / 255.0f;
    fragColor = vec4(velocityColor, 1.0f) * alpha;

    // show mask texture
    // float valid = texture(mask, v_texCoord).r;
    // if(valid == 0.0f){
    //     fragColor = vec4(0.0f);
    // }else{
    //     fragColor = vec4(0.77f, 0.08f, 0.08f, 0.64f);
    // }
    

    // fragColor = vec4(velocityColor, alpha);
    // fragColor = vec4(0.5f);

}