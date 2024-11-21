#ifdef VERTEX_SHADER

#define PI 3.1415926535897932384626433832795
#define RAD_TO_DEG 180.0 / PI
#define DEG_TO_RAD PI / 180.0



precision highp float;

layout(location = 0) in vec2 i_pos;//lnglat
uniform mat4 u_matrix;

// out vec2 uv;
// out vec3 positionWS;
// out vec3 normalWS;
// out vec3 tangentWS;
// out vec3 bitangentWS;
// out vec4 screenPos;
// out vec4 positionCS;

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

    // output.uv = attributes.zw;
    // output.positionWS = positionInputs.positionWS;
    // output.normalWS = normalize(normalInputs.normalWS);
    // output.tangentWS = normalize(normalInputs.tangentWS);
    // output.bitangentWS = normalize(normalInputs.bitangentWS);
    // output.screenPos = ComputeScreenPos(positionInputs.positionCS);
    // output.positionCS = positionInputs.positionCS;


    gl_Position = posinCS;
    texcoords = attributes.zw;

}

#endif

#ifdef FRAGMENT_SHADER

precision highp int;
precision highp float;
precision highp usampler2D;

void main() {

    return vec4(0.5, 0.5, 0.5, 1.0);
}

#endif