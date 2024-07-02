#version 300 es

in vec2 a_position;
uniform vec2 u_resolution;
uniform float u_size;
uniform vec3 u_color;

out vec2 param;

const vec2[4] vertexes = vec2[4](
    vec2(-1, -1),
    vec2(-1, 1),
    vec2(1, -1),
    vec2(1, 1)
);

void main(){
    
    int index = int(gl_VertexID);
    vec2 offset = vertexes[index];
    vec2 position = a_position + offset * u_size / u_resolution;
    param = offset;
    gl_Position = vec4(position, 0, 1);


}