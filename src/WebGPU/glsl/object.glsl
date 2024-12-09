#ifdef VERTEX_SHADER

layout(location = 0) in vec4 a_position;
layout(location = 1) in vec2 a_texcoord;
layout(location = 2) in vec3 a_norm;

uniform mat4 u_model_mat;
uniform mat4 u_view_mat;
uniform mat4 u_proj_mat;

out vec3 v_world_pos;
out vec3 v_norm;
out vec2 v_texcoord;

void main() {

  mat4 mvpMat = u_proj_mat * u_view_mat * u_model_mat;
  mat4 normalMat = inverse(transpose(u_model_mat));

  gl_Position = mvpMat * a_position;

  v_norm = vec3(normalMat * vec4(a_norm, 0.0));
  v_texcoord = a_texcoord;
  v_world_pos = (u_model_mat * a_position).xyz;
}

#endif
#ifdef FRAGMENT_SHADER

precision highp float;

in vec3 v_norm;
in vec2 v_texcoord;
in vec3 v_world_pos;

uniform vec3 u_lightPos;
uniform vec3 u_light_color;
uniform vec3 u_camera_pos;
uniform sampler2D u_texture;


out vec4 fragColor;

void main() {
  vec3 baseColor = texture(u_texture, v_texcoord).rgb;
  fragColor = vec4(baseColor, 1.0);
  return;

  vec3 normal = normalize(v_norm);
  vec3 lightDir = normalize(u_lightPos - v_world_pos);
  vec3 diffuse = max(dot(normal, lightDir), 0.0) * u_light_color;
  fragColor = vec4(diffuse * baseColor, 1.0);

  vec3 viewDir = normalize(u_camera_pos - v_world_pos);
  vec3 reflectDir = reflect(-lightDir, normal);
  float spec = pow(max(dot(viewDir, reflectDir), 0.0), 32.0);
  vec3 specular = spec * u_light_color;
  fragColor = vec4((diffuse + specular) * baseColor, 1.0);

}
#endif