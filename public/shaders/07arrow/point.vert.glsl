#version 300 es

in vec2 a_pos;

uniform mat4 u_matrix;

const float PI = 3.14159265359f;
vec2 lnglat2Mercator(float lng, float lat) {
    float x = (180.0f + lng) / 360.0f;
    float y = (180.0f - (180.0f / PI) * log(tan(PI / 4.0f + (lat * PI) / 360.0f))) / 360.0f;
    return vec2(x, y);
}

void main() {

    // vec2 mercator = lnglat2Mercator(a_pos.x, a_pos.y);
    vec2 pos = a_pos;
    gl_Position =  vec4(pos, 0.0f, 1.0f);
    gl_PointSize = 10.0f;
    // gl_Position = u_matrix * vec4(mercator, 0.0f, 1.0f);
}