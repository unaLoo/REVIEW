#ifdef VERTEX_SHADER
#define PI 3.1415926535897932384626433832795
#define RAD_TO_DEG 180.0 / PI
#define DEG_TO_RAD PI / 180.0

precision highp float;

layout(location = 0) in vec2 i_pos;//lnglat
uniform mat4 u_matrix;
uniform vec3 u_cameraPos;

out vec2 v_uv;
out vec3 v_positionWS;
out vec4 v_positionCS;

// const vec4[] vertices = vec4[4](vec4(-1.0, -1.0, 0.0, 0.0), vec4(1.0, -1.0, 1.0, 0.0), vec4(-1.0, 1.0, 0.0, 1.0), vec4(1.0, 1.0, 1.0, 1.0));
const vec4[] vertices = vec4[4](vec4(-1.0, -1.0, 0.0, 0.0), vec4(1.0, -1.0, 1.0, 0.0), vec4(-1.0, 1.0, 0.0, 1.0), vec4(1.0, 1.0, 1.0, 1.0));

//////// functions ///////////
float mercatorXfromLng(float lng) {
    return (180.0 + lng) / 360.0;
}
float mercatorYfromLat(float lat) {
    return (180.0 - (RAD_TO_DEG * log(tan(PI / 4.0 + lat / 2.0 * DEG_TO_RAD)))) / 360.0;
}

void main() {

    vec2 posinWS = vec2(mercatorXfromLng(i_pos.x), mercatorYfromLat(i_pos.y));
    vec4 posinCS = u_matrix * vec4(posinWS, 0.0, 1.0);

    vec4 attributes = vertices[gl_VertexID];

    v_uv = attributes.zw;
    v_positionWS = vec3(posinWS, 0.0);
    v_positionCS = posinCS;

    gl_Position = posinCS;
}

#endif

#ifdef FRAGMENT_SHADER

precision highp int;
precision highp float;
precision highp usampler2D;

uniform mat4 u_matrix;
uniform vec3 u_cameraPos;
uniform sampler2D u_depethTexture;
uniform sampler2D u_normalTexture1;
uniform sampler2D u_normalTexture2;
uniform float u_time;

uniform vec3 shallowColor;
uniform vec3 deepColor;
uniform vec4 SamplerParams;
uniform vec3 LightPos;
uniform float specularPower;

const vec3 v_normalWS = vec3(0.0, 0.0, 1.0);
const vec3 v_tangentWS = vec3(1.0, 0.0, 0.0);
const vec3 v_bitangentWS = vec3(0.0, 1.0, 0.0);

in vec2 v_uv;
in vec3 v_positionWS;
in vec4 v_positionCS;

out vec4 FragColor;

//////////// CONST ////////////
// const vec3 shallowColor = vec3(0.0, 0.6, 0.9);
// const vec3 deepColor = vec3(0.0, 0.13, 1.0);
// const float _FirstNormalSpeedInverse = 20.0;
// const float _SecondNormalSpeedInverse = -15.0;
// const vec3 LightPos = vec3(100.0, 20.0, 200.0);
const vec3 LightColor = vec3(1.0, 1.0, 1.0);
const vec3 specularColor = vec3(1.0, 1.0, 1.0);
// const float specularPower = 512.0;

vec3 unPack(vec3 norm) {
    return vec3(norm * 2.0 - 1.0);
}

vec3 getNormalFromMap(vec2 uv) {

    mat3 TBN = mat3(v_tangentWS, v_bitangentWS, v_normalWS);// tiling
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

    /////////// waterDepth ///////////
    vec3 viewVector = v_positionWS - u_cameraPos.xyz;

    float waterDepth = smoothstep(0.0, 1.0, (1.0 - texture(u_depethTexture, v_uv).r));
    if(waterDepth == 0.0)
        return;

    vec3 waterColor = vec3(0.0);
    waterColor = mix(shallowColor, deepColor, waterDepth) / 255.0;

    /////////// noraml and Blinn-Phong ///////////
    vec3 normalWS = getNormalFromMap(v_uv);

    vec3 lightDir = normalize(LightPos - vec3(0.0));
    vec3 viewDir = normalize(-1.0 * viewVector);

    vec3 halfwayDir = normalize(lightDir + viewDir);
    float NdotH = dot(normalWS, halfwayDir);
    vec3 specular = LightColor * specularColor * pow(NdotH, specularPower);

    waterColor += specular;

    FragColor = vec4(waterColor, waterDepth * 2.0);

}

#endif