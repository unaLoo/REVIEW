#ifdef VERTEX_SHADER

precision highp float;

out vec2 texcoords;

vec4[] vertices = vec4[4](vec4(-1.0, -1.0, 0.0, 0.0), vec4(1.0, -1.0, 1.0, 0.0), vec4(-1.0, 1.0, 0.0, 1.0), vec4(1.0, 1.0, 1.0, 1.0));

void main() {

    vec4 attributes = vertices[gl_VertexID];

    gl_Position = vec4(attributes.xy, 0.0, 1.0);
    texcoords = attributes.zw;
}

#endif

#ifdef FRAGMENT_SHADER

precision highp int;
precision highp float;
precision highp usampler2D;

in vec2 texcoords;

uniform sampler2D srcTexture;
uniform sampler2D paletteTexture;
uniform sampler2D depthTexture;

uniform vec2 e;
uniform float interval;
uniform float withLight;
uniform vec3 contourColor;

out vec4 fragColor;

vec3 colorMap(int index) {

    vec3 palette[11] = vec3[11](vec3(36.0, 73.0, 140.0), vec3(213.0, 62.0, 79.0), vec3(244.0, 109.0, 67.0), vec3(253.0, 174.0, 97.0), vec3(254.0, 224.0, 139.0), vec3(255.0, 255.0, 191.0), vec3(230.0, 245.0, 152.0), vec3(171.0, 221.0, 164.0), vec3(102.0, 194.0, 165.0), vec3(50.0, 136.0, 189.0), vec3(94.0, 79.0, 162.0));

    return palette[index] / 255.0;
}

vec2 uvCorrection(vec2 uv) {
    return clamp(uv, vec2(0.0), vec2(1.0));
}

vec4 loadTerrainInfo(vec2 uv, vec2 offset) {

    // vec2 dim = vec2(textureSize(depthTexture, 0));
    vec2 dim = vec2(textureSize(srcTexture, 0));
    return texelFetch(srcTexture, ivec2(uv * dim + offset), 0);
}

vec3 colorMapping_interval(float elevation) {

    float intervalNum = floor((e.y - e.x) / interval);
    float intervalIndex = floor((e.y - elevation) / interval);
    float rate = pow(2.71828, -0.7 * (1.0 - intervalIndex / intervalNum));
    vec2 uv = vec2(rate, 0.5);
    return texture(paletteTexture, uv).rgb;
}

vec3 colorMapping(float elevation) {

    vec2 uv = vec2(1.0 - 0.6 * sin((elevation - e.x) / (e.y - e.x)), 0.5);
    return texture(paletteTexture, uv).rgb;
}

int withinInterval(float elevation) {

    return int(elevation / interval);
}

void main() {

    float factor = 1.0;
    vec4 M = loadTerrainInfo(texcoords, vec2(0.0, 0.0));
    vec4 N = loadTerrainInfo(texcoords, vec2(0.0, factor));
    vec4 E = loadTerrainInfo(texcoords, vec2(factor, 0.0));
    vec4 S = loadTerrainInfo(texcoords, vec2(0.0, -factor));
    vec4 W = loadTerrainInfo(texcoords, vec2(-factor, 0.0));

    int intervalM = withinInterval(M.r);
    int intervalN = withinInterval(N.r);
    int intervalE = withinInterval(E.r);
    int intervalS = withinInterval(S.r);
    int intervalW = withinInterval(W.r);

    vec3 lightPosition = vec3(100.0, -100.0, 200.0);
    vec3 lightDir = normalize(lightPosition - vec3(0.0));
    vec3 norm = M.gba;
    float diff = clamp(dot(norm, lightDir), 0.0, 1.0);
    diff = withLight == 1.0 ? diff : 1.0;

    vec3 intervalColor = colorMapping(M.r) * diff;
    // vec3 intervalColor = vec3(1.0) * diff;
    vec3 outColor = intervalColor;

    float depthRate = (M.r - e.y) / (e.x - e.y);
    // float alpha = M.r < 9999.0 ? 1.0 * depthRate : 0.0;
    float alpha = M.r < 9999.0 ? 0.8 : 0.0;
    fragColor = vec4(outColor, alpha);

    // Countours
    if(intervalN < intervalM || intervalE < intervalM || intervalS < intervalM || intervalW < intervalM) {

        fragColor = vec4(intervalColor * 0.9, 0.4);
        if(intervalM == 0) {
            fragColor = vec4(0.0, 0.0, 0.0, 0.9);
        } else if(intervalM % 6 == 0) {
            fragColor = vec4(0.65, 0.04, 0.04, 0.9);
        } else if(intervalM % 10 == 0) {
            fragColor = vec4(0.03, 0.29, 0.46, 0.9);
        }
    }
}

#endif