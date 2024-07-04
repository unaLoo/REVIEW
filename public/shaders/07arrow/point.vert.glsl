#version 300 es

in vec2 a_pos;

uniform mat4 u_matrix;
uniform sampler2D uvTexture;

const float PI = 3.14159265359f;
vec2 lnglat2Mercator(float lng, float lat) {
    float x = (180.0f + lng) / 360.0f;
    float y = (180.0f - (180.0f / PI) * log(tan(PI / 4.0f + (lat * PI) / 360.0f))) / 360.0f;
    return vec2(x, y);
}

void main() {
    vec2 mercator = lnglat2Mercator(a_pos.x, a_pos.y);
    vec4 posInCS = u_matrix * vec4(mercator, 0.0f, 1.0f);
    vec2 posInSS = posInCS.xy / posInCS.w;
    vec2 uv = (posInSS + vec2(1.0f)) * 0.5f;
    uv = vec2(uv.x, uv.y);
    vec2 texel = texture(uvTexture, uv).rg;

    if (all(lessThan(texel, vec2(0.001f)))) {
        return;
    }

    gl_PointSize = 2.0f;
    gl_Position = u_matrix * vec4(mercator, 0.0f, 1.0f);
}