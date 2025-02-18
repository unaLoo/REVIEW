#ifdef VERTEX_SHADER

out vec2 v_texcoord;

const vec4[] vertices = vec4[4](
    vec4(-1.0, -1.0, 0.0, 0.0), 
    vec4(1.0, -1.0, 1.0, 0.0), 
    vec4(-1.0, 1.0, 0.0, 1.0), 
    vec4(1.0, 1.0, 1.0, 1.0));

void main() {
    vec4 vert = vertices[gl_VertexID];
    gl_Position = vec4(vert.xy,0.0,1.0);
    v_texcoord = vert.zw;
}

#endif
#ifdef FRAGMENT_SHADER

precision highp float;

in vec2 v_texcoord;
uniform sampler2D u_texture;


out vec4 fragColor;

void main() {

    vec4 color = texture(u_texture, v_texcoord);
    fragColor = color;

}
#endif