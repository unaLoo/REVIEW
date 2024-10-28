#ifdef VERTEX_SHADER

precision highp float;

out vec2 v_uv;

vec4[] vertices = vec4[4](vec4(-1.0, -1.0, 0.0, 0.0), vec4(1.0, -1.0, 1.0, 0.0), vec4(-1.0, 1.0, 0.0, 1.0), vec4(1.0, 1.0, 1.0, 1.0));

void main() {

    vec4 attributes = vertices[gl_VertexID];

    gl_Position = vec4(attributes.xy, 0.0, 1.0);
    v_uv = attributes.zw;
}

#endif
#ifdef FRAGMENT_SHADER

precision highp int;
precision highp float;
precision highp usampler2D;

uniform vec2 u_heightRange;
uniform float u_contourInterval;
uniform sampler2D heightTexture;

in vec2 v_uv;

float sampleHeight(vec2 uv, vec2 offset) {
    vec2 dim = vec2(textureSize(heightTexture, 0));
    float depth = texelFetch(heightTexture, ivec2(uv * dim + offset), 0).r * 1.0;
    return depth;
}

int withinInterval(float elevation) {
    return int((u_heightRange.y - elevation) / u_contourInterval);
}

vec3 colorMapping(float heightRate) {

    vec3[] palette = vec3[7](
        vec3(170.0, 196.0, 78.0) / 255.0,
        vec3(171.0, 214.0, 93.0) / 255.0,
        vec3(172.0, 213.0, 101.0) / 255.0,
        vec3(103.0, 206.0, 172.0) / 255.0,
        vec3(76.0, 210.0, 121.0) / 255.0,
        vec3(31.0, 196.0, 224.0) / 255.0,
        vec3(55.0, 174.0, 217.0) / 255.0
    );

    int index = int(rate * 7.0);
    return palette[index];

    // float intervalNum = floor((e.y - e.x) / interval);
    // float intervalIndex = floor((e.y - elevation) / interval);
    // float rate = pow(2.71828, -0.7 * (1.0 - intervalIndex / intervalNum));
    // vec2 uv = vec2(rate, 0.5);
    // return texture(paletteTexture, uv).rgb;

}



void main() {

    float factor = 1.0;
    float M = sampleHeight(v_uv, vec2(0.0, 0.0));
    float N = sampleHeight(v_uv, vec2(0.0, factor));
    float E = sampleHeight(v_uv, vec2(factor, 0.0));
    float S = sampleHeight(v_uv, vec2(0.0, -factor));
    float W = sampleHeight(v_uv, vec2(-factor, 0.0));

    float depthRate = (M - u_heightRange.x) / (u_heightRange.y - u_heightRange.x);

    int intervalM = withinInterval(M);
    int intervalN = withinInterval(N);
    int intervalE = withinInterval(E);
    int intervalS = withinInterval(S);
    int intervalW = withinInterval(W);

    if (M > u_heightRange.y) {
        
        fragColor = vec4(0.0);
    }
    else if (intervalN + intervalE + intervalS + intervalW != 4 * intervalM) {

        // fragColor = vec4(0.39, 0.04, 0.04, 1.0);
        fragColor = vec4(vec3(200) / 255.0, 0.7);
    } else {


        // vec3 lightPosition = vec3(100.0, -100.0, 20.0);
        // vec3 lightDir = normalize(lightPosition - vec3(0.0));
        // vec3 norm = M.gba;
        // float diff = max(dot(norm, lightDir), 0.0);

        vec3 color = colorMapping(depthRate);
        fragColor = vec4(color, 1.0 - pow(2.71828, -20.0 * (1.0 - depthRate)));
    }

}

#endif