#version 300 es

in vec2 a_startPos;
in vec2 a_endPos;

uniform mat4 u_matrix;
uniform vec2 u_screenSize;
uniform float aaWidth;
uniform float fillWidth;

out float opacity;



const float PI = 3.14159265359f;

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
    // instance draw , 4 vertex per instance
    vec2 startPos = a_startPos;
    vec2 endPos = a_endPos;
    int parity = gl_InstanceID % 2;

    vec4 startPosCS = getClipSpacePosition(startPos);
    vec4 endPosCS = getClipSpacePosition(endPos);
    vec2 startPosSS = startPosCS.xy / startPosCS.w;
    vec2 endPosSS = endPosCS.xy / endPosCS.w;

    vec2 start2endVector = normalize(endPosSS - startPosSS);
    vec3 view = vec3(0.0f, 0.0f, 1.0f);
    vec2 offsetVector = normalize(cross(vec3(start2endVector, 0.0f), view).xy) * (gl_VertexID % 2 == 0 ? 1.0f : -1.0f);

    float offsetSS = (fillWidth + aaWidth * 2.0f) * 0.5f;
    vec2 basePosSS = gl_VertexID / 2 == 0 ? startPosSS : endPosSS;
    vec2 offsetedPosSS = basePosSS + offsetVector * offsetSS / u_screenSize;

    vec4 offsetedPosCS = vec4(offsetedPosSS, 0.0f, 1.0f);
    gl_Position = offsetedPosCS;
    opacity = abs(2.0f * float(parity) - 1.0f); // 0,1 ==> -1,1

}