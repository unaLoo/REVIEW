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
uniform sampler2D maskTexture;

uniform vec2 e;
uniform float interval;
uniform float withContour;

out vec4 fragColor;

vec4 loadTerrainInfo(vec2 uv, vec2 offset) {

    vec2 dim = vec2(textureSize(srcTexture, 0));
    return texelFetch(srcTexture, ivec2(uv * dim + offset), 0);
}

vec3 colorMapping(float elevation) {

    vec2 uv = vec2(1.0 - 0.6 * sin((elevation - e.x) / (e.y - e.x)), 0.5);
    return texture(paletteTexture, uv).rgb;
}

int withinInterval(float elevation) {

    return int(elevation / interval);
}

float validFragment(vec2 uv) {
    return texture(maskTexture, uv).r;
}

void main() {

    if(validFragment(texcoords) == 0.0) {
        return;
    }

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

    // float diff = M.g;
    // vec3 intervalColor = colorMapping(M.r) * diff;
    // vec3 intervalColor = colorMapping(M.r);
    // vec3 outColor = intervalColor;
    // vec3 outColor = intervalColor * M.g;

    // height test
    // vec2 e = vec2(-66.5, 4.4);
    // vec3 outColor = vec3(abs(M.r) / length(e),0.5,0.5);
    vec3 intervalColor = colorMapping(M.r);

    // hillshade test
    // vec3 outColor = vec3((M.g));
    float hillshade = M.g;
    // float hillshade = M.g * 0.7 + 0.3;
    hillshade = 1.0;
    vec3 outColor = intervalColor * hillshade;
    // float depthRate = (M.r - e.y) / (e.x - e.y);
    // float alpha = M.r < 9999.0 ? 1.0 * depthRate : 0.0;
    float alpha = M.r < 9999.0 ? 0.9 : 0.0;

    fragColor = vec4(outColor, alpha);

    // Countours
    float contourAlpha = 0.8;
    if(withContour == 1.0) {
        if(intervalN < intervalM || intervalE < intervalM || intervalS < intervalM || intervalW < intervalM) {
            fragColor = vec4(intervalColor * 0.8, contourAlpha);
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