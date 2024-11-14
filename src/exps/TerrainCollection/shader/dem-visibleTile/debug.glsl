#ifdef VERTEX_SHADER
precision highp float;

out vec2 texcoords;

vec4[] vertices = vec4[4](vec4(-1.0, -1.0, 0.0, 0.0), vec4(1.0, -1.0, 1.0, 0.0), vec4(-1.0, 1.0, 0.0, 1.0), vec4(1.0, 1.0, 1.0, 1.0));

void main() {

    vec4 attributes = vertices[gl_VertexID];

    gl_Position = vec4(attributes.xy, 0.0, 1.0);
    texcoords = attributes.zw;
}

#endif

#ifdef FRAGMENT_SHADER
precision highp int;
precision highp float;
precision highp usampler2D;
in vec2 texcoords;

uniform sampler2D debugTexture;

out vec4 fragColor;

void main() {
    vec4 M = texture(debugTexture, texcoords);
    // float alpha = M.r < 9999.0 ? 0.8 : 0.0;
    // fragColor = vec4(vec3((M.r + 70.0) / 80.0), 1.0);
    fragColor = vec4(vec3(M.r), 0.3);
}   

#endif