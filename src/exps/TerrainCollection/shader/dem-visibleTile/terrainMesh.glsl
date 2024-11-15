
#ifdef VERTEX_SHADER

layout(location = 0) in vec2 a_position;

uniform mat4 u_matrix;
uniform mat4 u_modelMatrix;
uniform float u_skirt_height;
uniform float u_exaggeration;
uniform float u_dem_scale;
uniform vec2 u_dem_tl;

uniform sampler2D float_dem_texture;

const float MAPBOX_TILE_EXTENT = 8192.0;
const float SKIRT_OFFSET = 24575.0;
const float PI = 3.1415926535897932384626433832795;
const float altitudeDegree = 90.0;
const float azimuthDegree = 315.0;

out float v_height;
out vec3 v_normal;
out float v_hillShade;

vec3 decomposeToPosAndSkirt(vec2 posWithComposedSkirt) {
    float skirt = float(posWithComposedSkirt.x >= SKIRT_OFFSET);
    vec2 pos = posWithComposedSkirt - vec2(skirt * SKIRT_OFFSET, 0.0);
    return vec3(pos, skirt);
}

vec2 uvCorrection(vec2 uv) {
    return clamp(uv, vec2(0.0), vec2(1.0));
}

float sampleTerrainF32Texel(vec2 uv, vec2 dim) {

    vec2 _uv = uvCorrection(uv);
    vec2 scaled_uv = (dim * _uv + 1.5) / (dim + 2.0);
    return texture(float_dem_texture, scaled_uv).r;
}

float linearSamplingF32TerrainHeight(vec2 uv, vec2 dim, float tl, float tr, float bl, float br) {

    float mix_x = fract(uv.x * dim.x);
    float mix_y = fract(uv.y * dim.y);
    float top = mix(tl, tr, mix_x);
    float bottom = mix(bl, br, mix_x);
    return mix(top, bottom, mix_y);
}

///////////// hillshade ///////////////
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
    float hillShade = ((cos(Zenith_rad) * cos(Slope_rad)) +
        (sin(Zenith_rad) * sin(Slope_rad) * cos(Azimuth_rad - Aspect_rad)));
    return clamp(hillShade, 0.0, 255.0);
}

void main() {

    vec3 pos_skirt = decomposeToPosAndSkirt(a_position);
    vec2 pos = pos_skirt.xy;
    float skirt = pos_skirt.z;

    vec2 uv = clamp(vec2(pos.x, pos.y) / MAPBOX_TILE_EXTENT * u_dem_scale + u_dem_tl, vec2(0.0), vec2(1.0));
    vec2 dim = vec2(textureSize(float_dem_texture, 0)) - 2.0;

    vec2 offsets[4] = vec2[](vec2(0.0, 0.0), vec2(1.0, 0.0), vec2(0.0, 1.0), vec2(1.0, 1.0));

    float tl = sampleTerrainF32Texel(uv + offsets[0] / dim, dim);
    float tr = sampleTerrainF32Texel(uv + offsets[1] / dim, dim); // E
    float bl = sampleTerrainF32Texel(uv + offsets[2] / dim, dim); // N
    float br = sampleTerrainF32Texel(uv + offsets[3] / dim, dim);
    float eS = sampleTerrainF32Texel(uv + vec2(0.0, -1.0) / dim, dim); // S
    float eW = sampleTerrainF32Texel(uv + vec2(-1.0, 0.0) / dim, dim); // W
    float height = linearSamplingF32TerrainHeight(uv, dim, tl, tr, bl, br);

    vec3 dx = normalize(vec3(1.0, 0.0, tr - eW));
    vec3 dy = normalize(vec3(0.0, 1.0, bl - eS));

    float z = 30.0 * height - skirt * 10000.0;
    gl_Position = u_matrix * u_modelMatrix * vec4(pos.xy, z, 1.0);
    v_normal = normalize(cross(dx, dy));
    v_height = height;

    float zenithRad = calcZenith(altitudeDegree);
    float azimuthRad = calcAzimuth(azimuthDegree);
    vec2 slope_aspect = calcSlopeAndAspect(uv, float_dem_texture);

    float hillShade = calcHillShade(zenithRad, azimuthRad, slope_aspect.x, slope_aspect.y);

    v_hillShade = hillShade;
}
#endif

#ifdef FRAGMENT_SHADER
precision highp float;

in float v_height;
in vec3 v_normal;
in float v_hillShade;

uniform sampler2D float_dem_texture;

layout(location = 0) out vec4 outColor;
layout(location = 1) out vec4 outColor2;

void main() {

    outColor2 = vec4(v_hillShade, 0.0, 0.0, 0.0);
    outColor = vec4(v_height, v_normal);

}
#endif