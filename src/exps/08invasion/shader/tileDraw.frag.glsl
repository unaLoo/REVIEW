#version 300 es
precision highp float;

in vec2 v_uv;
in float isSkirt;
uniform sampler2D u_inputTile;
uniform vec3 u_tileInfo; // z range -- 4
uniform float u_exaggeration;

out vec4 FragColor;

const float interval = 50.0f;

vec3 noData = vec3(0.0f, 0.0f, 0.0f);

bool isNoData(vec3 color, vec3[4] neighbors) {

    bool flag = false;
    for(int i = 0; i < 4; i++) {
        if(all(lessThan(abs(neighbors[i] - noData), vec3(0.00001f)))) {
            flag = true;
            return flag;
        }
    }
    return all(lessThan(abs(color - noData), vec3(0.00001f)));
}

bool isContourPoint(vec3 color, vec3[4] neighbors) {
    float height = abs(-(1.0f - color.x) * u_exaggeration);

    int intervalM = int(height / interval);
    int intervalSum = 0;
    for(int i = 0; i < 4; i++) {
        float neighborHeight = abs(-(1.0f - neighbors[i].x) * u_exaggeration);
        int neighborInterval = int(neighborHeight / interval);
        intervalSum += neighborInterval;
    }

    return intervalSum == 4 * intervalM ? false : true;
}

vec3 colorMap(uint index) {
    vec3 palette[11] = vec3[11](vec3(158.0f, 1.0f, 66.0f), vec3(213.0f, 62.0f, 79.0f), vec3(244.0f, 109.0f, 67.0f), vec3(253.0f, 174.0f, 97.0f), vec3(254.0f, 224.0f, 139.0f), vec3(255.0f, 255.0f, 191.0f), vec3(230.0f, 245.0f, 152.0f), vec3(171.0f, 221.0f, 164.0f), vec3(102.0f, 194.0f, 165.0f), vec3(50.0f, 136.0f, 189.0f), vec3(94.0f, 79.0f, 162.0f));

    vec3 palette2[11] = vec3[11](vec3(0, 0, 51), vec3(0, 23, 70), vec3(0, 46, 88), vec3(0, 70, 107), vec3(0, 93, 125), vec3(0, 116, 144), vec3(0, 139, 162), vec3(0, 162, 181), vec3(0, 185, 199), vec3(0, 209, 218), vec3(0, 232, 236));

    return palette2[index] / 255.0f;
}
vec3 getColorWithHeight(float height) {
    float index = height * 10.0f;
    uint lowIndex = uint(index);
    uint highIndex = uint(min(float(lowIndex) + 1.0f, 10.0f));
    float blend = index - float(lowIndex);

    vec3 lowColor = colorMap(lowIndex);
    vec3 highColor = colorMap(highIndex);

    return mix(lowColor, highColor, blend);
}

vec2 uvCorrection(vec2 uv) {
    return clamp(uv, vec2(0.0f), vec2(1.0f));
}

void main() {

    ////// fill
    // vec4 color = texture(u_inputTile, v_uv);
    float factor = 1.0f;
    vec2 offset[4] = vec2[4](vec2(-factor, 0.0f), vec2(factor, 0.0f), vec2(0.0f, factor), vec2(0.0f, -factor));
    vec2 textureSize = vec2(textureSize(u_inputTile, 0));

    vec4 M = texture(u_inputTile, uvCorrection(v_uv));
    vec4 Left = texture(u_inputTile, uvCorrection(v_uv + offset[0] / textureSize));
    vec4 Right = texture(u_inputTile, uvCorrection(v_uv + offset[1] / textureSize));
    vec4 Top = texture(u_inputTile, uvCorrection(v_uv + offset[2] / textureSize));
    vec4 Bottom = texture(u_inputTile, uvCorrection(v_uv + offset[3] / textureSize));

    // float height = color.x * 0.4f + 0.6f;
    float height = M.x * 0.9f + 0.1f;

    if(isSkirt > 0.0f) {
        FragColor = vec4(1.0f, 0.04f, 0.04f, 1.0f);
        return;
    }
    if(isNoData(M.rgb, vec3[4](Left.rgb, Right.rgb, Top.rgb, Bottom.rgb))) {
        FragColor = vec4(0.0f);
        return;
    } 
    // else if(isContourPoint(M.rgb, vec3[4](Left.rgb, Right.rgb, Top.rgb, Bottom.rgb))) {

    //     FragColor = vec4(0.97f, 0.97f, 0.97f, 1.0f);// dark base map
    //     return;
    // } 

    // FragColor = vec4(getColorWithHeight(height), 0.4f);
    FragColor = vec4(M.rgb,0.5f);
    // FragColor = vec4(0.3f);

}