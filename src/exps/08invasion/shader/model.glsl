#ifdef VERTEX_SHADER

in vec4 a_position;
in vec3 a_norm;

uniform mat4 u_projection;
uniform mat4 u_view;
uniform mat4 u_world;

out vec3 v_norm;

void main() {
    gl_Position = u_projection * u_view * u_world * a_position;
    v_norm = mat3(u_world) * a_norm;
}

#endif
#ifdef FRAGMENT_SHADER

precision highp float;

in vec3 v_norm;

uniform vec4 u_diffuse;
uniform vec3 u_lightDirection;

out vec4 outColor;

void main () {
  vec3 normal = normalize(v_norm);
  float light = dot(u_lightDirection, normal) * .5 + .5;
  outColor = vec4(u_diffuse.rgb * light, u_diffuse.a);
}
#endif