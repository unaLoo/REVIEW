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

uniform sampler2D showTexture1;
uniform sampler2D showTexture2;

out vec4 fragColor;


void main() {
    vec4 color1 = texture(showTexture1, texcoords);
    vec4 color2 = texture(showTexture2, texcoords);
    vec4 color = mix(color1, color2, 0.5);
    // float alpha = color.r < 0.4 ? color.a : 0.0;
    fragColor = vec4(color);
}

#endif