#ifdef VERTEX_SHADER

#define PI 3.141592653589793
#define RAD_TO_DEG 180.0/PI
#define DEG_TO_RAD PI/180.0

precision highp float;

layout(location = 0) in vec2 a_pos;
uniform mat4 u_matrix;

//////// functions ///////////
float mercatorXfromLng(float lng) {
    return (180.0 + lng) / 360.0;
}
float mercatorYfromLat(float lat) {
    return (180.0 - (RAD_TO_DEG * log(tan(PI / 4.0 + lat / 2.0 * DEG_TO_RAD)))) / 360.0;
}

void main() {
    vec2 pos = vec2(mercatorXfromLng(a_pos.x), mercatorYfromLat(a_pos.y));
    gl_Position = u_matrix * vec4(pos, 0.0, 1.0);
}

#endif
#ifdef FRAGMENT_SHADER
precision highp float;

out vec4 fragColor;
void main() {
    fragColor = vec4(0.5, 0.0, 0.0, 1.0);
}
#endif