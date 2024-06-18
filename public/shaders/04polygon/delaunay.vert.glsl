#version 300 es

in vec2 a_position;//station position ==> vec2(lng,lat)
in vec2 a_velocity;//velocity from bin ==> vec2(u,v)

uniform vec4 u_mapExtent;// minx, miny, maxx, maxy
uniform mat4 u_matrix;

out vec2 v_velocity;

const float PI = 3.141592653f;


vec2 lnglat2Mercator(float lng, float lat) {
    float x = (180.0f + lng) / 360.0f;
    float y = (180.0f - (180.0f / PI) * log(tan(PI / 4.0f + (lat * PI) / 360.0f))) / 360.0f;
    return vec2(x, y);
}

void main() {

    // float x = (a_position.x - u_mapExtent.x) / (u_mapExtent.z - u_mapExtent.x);
    // float y = (a_position.y - u_mapExtent.y) / (u_mapExtent.w - u_mapExtent.y);

    vec2 mercator = lnglat2Mercator(a_position.x, a_position.y);

    v_velocity = a_velocity;
    // v_velocity = a_position;
    // v_velocity = vec2(1.0f, 0.0f);
    // gl_Position = u_matrix * vec4(x, y, 0.0f, 1.0f);

    // gl_Position = u_matrix * vec4(mercator.x, mercator.y, 0.0f, 1.0f);

    // vec2 mercator = lnglat2Mercator(a_position.x, a_position.y);

    // 管线测试
    // float vert[6] = float[6](0.0f, 0.0f, 0.5f, 0.5f, 0.5f, -0.5f);
    // int id = gl_VertexID;
    // vec2 position = vec2(vert[id * 2], vert[id * 2 + 1]);

    // gl_Position = u_matrix * vec4(x, y, 0.0f, 1.0f);
    gl_Position = u_matrix * vec4(a_position, 0.0f, 1.0f);
    // gl_Position = u_matrix * vec4(mercator, 0.0f, 1.0f);

}