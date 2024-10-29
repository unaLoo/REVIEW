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

const float PI = 3.1415926535897932384626433832795;
const float altitudeDegree = 45.0;
const float azimuthDegree = 315.0;

in vec2 texcoords;

uniform sampler2D srcTexture;
// uniform float altitudeDegree;//高度角
// uniform float azimuthDegree;//方位角

out float fragColor;

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
    // g,  h,  i
    //////////////
    float a = texture(heightTexture, uvCorrection(uv + vec2(-1.0, 1.0) / dim)).r;
    float b = texture(heightTexture, uvCorrection(uv + vec2(0.0, 1.0) / dim)).r;
    float c = texture(heightTexture, uvCorrection(uv + vec2(1.0, 1.0) / dim)).r;
    float d = texture(heightTexture, uvCorrection(uv + vec2(-1.0, 0.0) / dim)).r;
    float e = texture(heightTexture, uvCorrection(uv + vec2(0.0, 0.0) / dim)).r;
    float f = texture(heightTexture, uvCorrection(uv + vec2(1.0, 0.0) / dim)).r;
    float g = texture(heightTexture, uvCorrection(uv + vec2(-1.0, -1.0) / dim)).r;
    float h = texture(heightTexture, uvCorrection(uv + vec2(0.0, -1.0) / dim)).r;
    float i = texture(heightTexture, uvCorrection(uv + vec2(1.0, -1.0) / dim)).r;

    float dzdx = ((c + 2.0 * e + h) - (a + 2.0 * d + f)) / 8.0;
    float dzdy = ((g + 2.0 * h + i) - (a + 2.0 * b + c)) / 8.0;

    float slopeRad = atan(sqrt(dzdx * dzdx + dzdy * dzdy));

    float aspectRad = 0.0;
    if(dzdx != 0.0) {
        aspectRad = atan(dzdy, -dzdx);
        // if(aspectRad < 0.0) {
        //     aspectRad = 2.0 * PI + aspectRad;
        // }
        aspectRad = mix(aspectRad, 2.0 * PI + aspectRad, aspectRad < 0.0);
    } else {
        aspectRad = dzdy > 0.0 ? PI / 2.0 : (dzdy < 0.0 ? PI * 3.0 / 2.0 : 0.0);
    }
    return vec2(slopeRad, aspectRad);
}

float calcHillShade(float Zenith_rad, float Azimuth_rad, float Slope_rad, float Aspect_rad) {
    float hillShade = 255.0 * ((cos(Zenith_rad) * cos(Slope_rad)) +
        (sin(Zenith_rad) * sin(Slope_rad) * cos(Azimuth_rad - Aspect_rad)));
    return clamp(hillShade, 0.0, 255.0);
}

void main() {

    float zenithRad = calcZenith(altitudeDegree);
    float azimuthRad = calcAzimuth(azimuthDegree);
    vec2 slope_aspect = calcSlopeAndAspect(texcoords, srcTexture);

    float hillShade = calcHillShade(zenithRad, azimuthRad, slope_aspect.x, slope_aspect.y);

    // fragColor = vec4(abs(hillShade)/255.0,0.0,0.0,0.5);
    fragColor = abs(hillShade) / 255.0;
}

#endif