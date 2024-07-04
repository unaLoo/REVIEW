#version 300 es

in vec2 startPos;
in vec2 endPos;

uniform mat4 u_matrix;
uniform mat2 u_rotateMatrix;
uniform float u_arrowLength;
uniform vec2 u_canvasSize;

const vec4 wiseClock = vec4(1.0f, 1.0f, 1.0f, 1.0f);
const vec4 Counterclockwise = vec4(1.0f, -1.0f, -1.0f, 1.0f);

mat2 trans(mat2 m, vec4 v) {
    return mat2(m[0][0] * v.x, m[0][1] * v.y, m[1][0] * v.z, m[1][1] * v.w);
}

const float PI = 3.1415926535897932384626433832795f;
vec2 lnglat2Mercator(float lng, float lat) {
    float x = (180.0f + lng) / 360.0f;
    float y = (180.0f - (180.0f / PI) * log(tan(PI / 4.0f + (lat * PI) / 360.0f))) / 360.0f;
    return vec2(x, y);
}
vec4 getClipSpacePosition(vec2 pos) { // pos in lnglat
    vec2 mercatorPos = lnglat2Mercator(pos.x, pos.y);
    return u_matrix * vec4(mercatorPos, 0.0f, 1.0f);
}

void main() {

    if(gl_VertexID == 1 || gl_VertexID == 2) {
        gl_Position = getClipSpacePosition(endPos);
        return;
    }

    vec4 startPosCS = getClipSpacePosition(startPos);
    vec4 endPosCS = getClipSpacePosition(endPos);

    vec4 startPosSS = startPosCS / startPosCS.w;
    vec4 endPosSS = endPosCS / endPosCS.w;

    vec2 end2start = normalize(startPosSS.xy - endPosSS.xy);
    mat2 rotateM = trans(u_rotateMatrix, gl_VertexID == 0 ? Counterclockwise : wiseClock);
    vec2 rotatedVector = normalize(rotateM * end2start);
    vec2 offsertedPosInSS = endPosSS.xy + rotatedVector * u_arrowLength / u_canvasSize;

    // gl_Position = vec4(offsertedPosInSS, 0.0f, 1.0f) * endPosCS.w;
    gl_Position = vec4(offsertedPosInSS, 0.0f, 1.0f) * 1.0;
    gl_PointSize = 1.0f;
}