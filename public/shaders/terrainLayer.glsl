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
uniform sampler2D hillShadeTexture;

uniform vec2 e;
uniform float interval;
uniform float withContour;
uniform vec3 contourColor;

out vec4 fragColor;

vec4 loadTerrainInfo(vec2 uv, vec2 offset) {

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

float calcHillShadeFactor(vec2 uv) {

    // return texture(hillShadeTexture, uv).r;

    vec2 dim = vec2(textureSize(hillShadeTexture, 0));
    vec4 tl = texture(hillShadeTexture, uv);
    vec4 tr = texture(hillShadeTexture, uv + vec2(1.0, 0.0) / dim);
    vec4 bl = texture(hillShadeTexture, uv + vec2(0.0, 1.0) / dim);
    vec4 br = texture(hillShadeTexture, uv + vec2(1.0, 1.0) / dim);
    float mix_x = fract(uv.x);
    float mix_y = fract(uv.y);
    vec4 top = mix(tl, tr, mix_x);
    vec4 bottom = mix(bl, br, mix_x);
    vec4 linearColor = mix(top, bottom, mix_y);

    return linearColor.r;
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

    float diff = 1.0;
    vec3 intervalColor = colorMapping(M.r) * diff;
    vec3 outColor = intervalColor;

    float depthRate = (M.r - e.y) / (e.x - e.y);
    // float alpha = M.r < 9999.0 ? 1.0 * depthRate : 0.0;
    float alpha = M.r < 9999.0 ? 0.8 : 0.0;

    // fragColor = vec4(outColor, alpha);

    float hsFactor = calcHillShadeFactor(texcoords);

    fragColor = vec4(outColor * hsFactor * 1.2, alpha);

    // Countours
    float contourAlpha = 0.8;
    if(withContour == 1.0) {
        if(intervalN < intervalM || intervalE < intervalM || intervalS < intervalM || intervalW < intervalM) {
            fragColor = vec4(intervalColor * 0.9, 0.4);
            if(intervalM == 0) {
                fragColor = vec4(0.0, 0.0, 0.0, contourAlpha);
            } else if(intervalM % 6 == 0) {
                fragColor = vec4(0.65, 0.04, 0.04, contourAlpha);
            } else if(intervalM % 10 == 0) {
                fragColor = vec4(0.03, 0.29, 0.46, contourAlpha);
            }
        }
    }

}

#endif