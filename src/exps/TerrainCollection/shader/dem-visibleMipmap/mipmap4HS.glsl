#ifdef VERTEX_SHADER

vec2[] vertices = vec2[4](vec2(-1.0, -1.0), vec2(1.0, -1.0), vec2(-1.0, 1.0), vec2(1.0, 1.0));

void main() {
    vec2 vertex = vertices[gl_VertexID];
    gl_Position = vec4(vertex, 0.0, 1.0);
}

#endif

#ifdef FRAGMENT_SHADER
precision highp float;
precision highp usampler2D;

const float PI = 3.1415926535897932384626433832795;
const float altitudeDegree = 60.0;
const float azimuthDegree = 55.0;

uniform sampler2D mipmapDEMtexture;
uniform float mipmapLevel;

out float fragColor; // output to the R8 texture

vec2 uvCorrection(vec2 uv) {

    return clamp(uv, vec2(0.0), vec2(1.0));
}

float deg2rad(float deg) {
    return deg * PI / 180.0;
}

float rad2deg(float rad) {
    return rad * 180.0 / PI;
}

float calcZenith(float altitudeDegree) {
    // 入射角
    return deg2rad(90.0 - altitudeDegree);
}

float calcAzimuth(float azimuthDegree) {
    // 入射方向
    float validAzimuthDegree = mod(azimuthDegree + 360.0, 360.0);
    return deg2rad(360.0 - validAzimuthDegree + 90.0);
}

vec2 calcSlopeAndAspect(vec2 normCoords, sampler2D heightTexture) {

    vec2 uv = uvCorrection(normCoords);
    vec2 dim = vec2(textureSize(heightTexture, 0));
    ///////////////
    // a,  b,  c,
    // d,  e,  f,
    // g,  h,  i,
    //////////////
    float e = textureLod(heightTexture, uvCorrection(uv + vec2(0.0, 0.0) / dim), mipmapLevel).r;
    if(e == 9999.0)
        return vec2(9999.0, 9999.0);

    float a = textureLod(heightTexture, uvCorrection(uv + vec2(-1.0, 1.0) / dim), mipmapLevel).r;
    float b = textureLod(heightTexture, uvCorrection(uv + vec2(0.0, 1.0) / dim), mipmapLevel).r;
    float c = textureLod(heightTexture, uvCorrection(uv + vec2(1.0, 1.0) / dim), mipmapLevel).r;
    float d = textureLod(heightTexture, uvCorrection(uv + vec2(-1.0, 0.0) / dim), mipmapLevel).r;
    float f = textureLod(heightTexture, uvCorrection(uv + vec2(1.0, 0.0) / dim), mipmapLevel).r;
    float g = textureLod(heightTexture, uvCorrection(uv + vec2(-1.0, -1.0) / dim), mipmapLevel).r;
    float h = textureLod(heightTexture, uvCorrection(uv + vec2(0.0, -1.0) / dim), mipmapLevel).r;
    float i = textureLod(heightTexture, uvCorrection(uv + vec2(1.0, -1.0) / dim), mipmapLevel).r;

    float dzdx = ((c + 2.0 * e + h) - (a + 2.0 * d + f)) / 8.0;
    float dzdy = ((g + 2.0 * h + i) - (a + 2.0 * b + c)) / 8.0;

    float slopeRad = atan(sqrt(dzdx * dzdx + dzdy * dzdy));

    float aspectRad = 0.0;
    if(dzdx != 0.0) {
        aspectRad = atan(dzdy, -dzdx);
        aspectRad = mix(aspectRad, 2.0 * PI + aspectRad, aspectRad < 0.0);
    } else {
        aspectRad = dzdy > 0.0 ? PI / 2.0 : (dzdy < 0.0 ? PI * 3.0 / 2.0 : 0.0);
    }
    return vec2(slopeRad, aspectRad);
}

float calcHillShade(float Zenith_rad, float Azimuth_rad, float Slope_rad, float Aspect_rad) {
    float hillShade = ((cos(Zenith_rad) * cos(Slope_rad)) +
        (sin(Zenith_rad) * sin(Slope_rad) * cos(Azimuth_rad - Aspect_rad)));
    return hillShade;
}

void main() {
    // already gl.setViewport(0, 0, dim.x, dim.y) in javascript
    vec2 dim = vec2(textureSize(mipmapDEMtexture, int(mipmapLevel)));
    vec2 uv = gl_FragCoord.xy / dim;
    float zenithRad = calcZenith(altitudeDegree);
    float azimuthRad = calcAzimuth(azimuthDegree);
    vec2 slope_aspect = calcSlopeAndAspect(uv, mipmapDEMtexture);

    // if(slope_aspect.x == 9999.0 && slope_aspect.y == 9999.0) {
    //     fragColor = 0.0;
    //     return;
    // }

    float hillShade = calcHillShade(zenithRad, azimuthRad, slope_aspect.x, slope_aspect.y);
    fragColor = hillShade;
}

#endif