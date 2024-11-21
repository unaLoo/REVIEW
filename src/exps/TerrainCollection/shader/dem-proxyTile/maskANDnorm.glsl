#ifdef VERTEX_SHADER

#define PI 3.141592653589793
#define RAD_TO_DEG 180.0/PI
#define DEG_TO_RAD PI/180.0

layout(location = 0) in vec4 aPosition;

out vec2 SSpos;

float mercatorXfromLng(float lng) {
    return (180.0 + lng) / 360.0;
}
float mercatorYfromLat(float lat) {
    return (180.0 - (RAD_TO_DEG * log(tan(PI / 4.0 + lat / 2.0 * DEG_TO_RAD)))) / 360.0;
}
vec2 mercatorFromLngLat(vec2 lngLat) {
    return vec2(mercatorXfromLng(lngLat.x), mercatorYfromLat(lngLat.y));
}

uniform mat4 u_matrix;

void main() {
    vec4 CSpos = u_matrix * vec4(mercatorFromLngLat(aPosition.xy), 0.0, 1.0);
    SSpos = CSpos.xy / CSpos.w * 0.5 + 0.5;
    gl_Position = CSpos;
}
#endif
#ifdef FRAGMENT_SHADER
precision lowp float;

uniform sampler2D u_normalTexture1;
uniform sampler2D u_normalTexture2;
uniform float u_time;
uniform vec4 SamplerParams;

in vec2 SSpos;
out vec4 FragColor;

const vec3 NormalWS = vec3(0.0, 0.0, 1.0);
const vec3 TangentWS = vec3(1.0, 0.0, 0.0);
const vec3 BitangentWS = vec3(0.0, 1.0, 0.0);

////////////////////////////////////////////
/////////// Sampler for normal 
////////////////////////////////////////////
vec3 unPack(vec3 norm) {
    return vec3(norm * 2.0 - 1.0);
}

vec3 getNormalFromMap(vec2 uv) {

    mat3 TBN = mat3(TangentWS, BitangentWS, NormalWS);// tiling
    vec2 dim = vec2(textureSize(u_normalTexture1, 0));
    vec3 firstNormalTS = texture(u_normalTexture1, uv * SamplerParams.x + vec2(u_time / SamplerParams.y, 0.0) / dim).rgb;
    vec3 secondNormalTS = texture(u_normalTexture2, uv * SamplerParams.z + vec2(u_time / SamplerParams.w, 0.0) / dim).rgb;
    firstNormalTS = unPack(firstNormalTS);
    secondNormalTS = unPack(secondNormalTS);
    vec3 normalTS = normalize(firstNormalTS + secondNormalTS);
    vec3 normalWS = normalize(TBN * normalTS);
    return normalWS;

}

void main() {
    vec2 uv = SSpos;
    // FragColor = vec4(uv, 0.0, 1.0);
    vec3 normalWS = getNormalFromMap(uv);
    FragColor = vec4(1.0, normalWS);
    // FragColor = vec4(normalWS, 1.0);
}

#endif