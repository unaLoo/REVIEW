#version 300 es

in vec2 startPos;
in vec2 endPos;

uniform mat4 u_matrix;
uniform float u_arrowAngle;
uniform float u_arrowLength;
uniform vec2 u_canvasSize;

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

mat2 rotate(float angle, bool clockwise) {
    float s = sin(angle * PI / 180.0f);
    float c = cos(angle * PI / 180.0f);
    return clockwise ? mat2(c, -s, s, c) : mat2(c, s, -s, c);
}

mat3 rotateMat(float angle) {
    // rotete around z
    float s = sin(angle * PI / 180.0f);
    float c = cos(angle * PI / 180.0f);
    return mat3(c, s, 0, -s, c, 0, 0, 0, 1);
}

void main() {

    if(gl_VertexID == 1 || gl_VertexID == 2) {
        gl_Position = getClipSpacePosition(endPos);
        return;
    }
    // World Space offset
    float scaleFactor = 5000.0f;
    vec2 end2start = normalize(startPos - endPos);
    mat2 rotateM = rotate(u_arrowAngle, gl_VertexID == 0);
    vec2 rotatedVector = (rotateM * end2start);
    vec2 offsertedPos = endPos + rotatedVector * u_arrowLength / scaleFactor;
    gl_Position = getClipSpacePosition(offsertedPos);



    // Screen Space offset
    // vec4 startPosCS = getClipSpacePosition(startPos);
    // vec4 endPosCS = getClipSpacePosition(endPos);

    // vec4 startPosSS = startPosCS / startPosCS.w;
    // vec4 endPosSS = endPosCS / endPosCS.w;

    // vec2 end2start = normalize(startPosSS.xy - endPosSS.xy);
    // mat2 rotateM = rotate(u_arrowAngle, gl_VertexID == 0 ? false : true);
    // vec2 rotatedVector = (rotateM * end2start);
    // vec2 offsertedPosInSS = endPosSS.xy + rotatedVector * u_arrowLength / u_canvasSize.x;
    // gl_Position = vec4(offsertedPosInSS, 0.0f, 1.0f) * endPosCS.w;
}
