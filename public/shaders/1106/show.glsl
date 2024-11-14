#ifdef VERTEX_SHADER

precision highp float;

const float SKIRT_HEIGHT_FLAG = 24575.0;

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

const float SKIRT_HEIGHT_FLAG = 24575.0;
const vec3 lightPosition = vec3(100.0, -100.0, 200.0);

in vec2 texcoords;

uniform sampler2D meshTexture;
uniform sampler2D paletteTexture;
uniform sampler2D maskTexture;
uniform sampler2D diffTexture;

uniform vec2 e;
uniform float interval;
uniform float withContour;
uniform float lightingMode;

out vec4 fragColor;


float sigmod(float x) {
    return 1.0 / (1.0 + exp(-x));
}

vec2 decomposeHeight(float heightValue) {
    float skirt = float(heightValue >= SKIRT_HEIGHT_FLAG);
    float realHeight = heightValue - skirt * SKIRT_HEIGHT_FLAG;
    return vec2(realHeight, skirt);
}

vec3 loadTerrainInfo(vec2 uv, vec2 offset) {

    vec2 dim = vec2(textureSize(meshTexture, 0));
    // return texelFetch(meshTexture, ivec2(uv * dim + offset), 0);
    vec4 texel = texelFetch(meshTexture, ivec2(uv * dim + offset), 0);
    vec2 height_skirt = decomposeHeight(texel.r);
    return vec3(height_skirt.x, texel.g, height_skirt.y);//realheight , hillshade, skirt
}

float sampleHillshade(vec2 uv) {
    return texture(diffTexture, uv).r;
}

float calcNormDiff(vec2 uv) {
    vec3 normal = texture(diffTexture, uv).gba;
    vec3 lightDir = normalize(lightPosition - vec3(0.0));
    float diff = clamp(dot(normal, lightDir), 0.0, 1.0);
    // diff = sigmod(diff);
    diff = diff * 0.6 + 0.4;
    return diff;
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
    vec3 M = loadTerrainInfo(texcoords, vec2(0.0, 0.0));
    vec3 N = loadTerrainInfo(texcoords, vec2(0.0, factor));
    vec3 E = loadTerrainInfo(texcoords, vec2(factor, 0.0));
    vec3 S = loadTerrainInfo(texcoords, vec2(0.0, -factor));
    vec3 W = loadTerrainInfo(texcoords, vec2(-factor, 0.0));

    int intervalM = withinInterval(M.r);
    int intervalN = withinInterval(N.r);
    int intervalE = withinInterval(E.r);
    int intervalS = withinInterval(S.r);
    int intervalW = withinInterval(W.r);

    vec3 intervalColor = colorMapping(M.r);
    vec3 outColor = intervalColor;

    if(lightingMode == 1.0) {
        float hillshade = sampleHillshade(texcoords);
        outColor = intervalColor * hillshade;
    } else if(lightingMode == 2.0) {
        float normDiff = calcNormDiff(texcoords);
        outColor = intervalColor * normDiff;
    }

    float alpha = 1.0;
    if(M.r <= -9999.0) {
        fragColor = vec4(0.0);
        return;
    }

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

    // fragColor = vec4((M.r + 60.0) / 70.0, 0.5, 0.6, 1.0);
}

#endif