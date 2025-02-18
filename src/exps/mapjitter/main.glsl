
// MODEL_POSITION_ON_GPU

vec3 pos_color = normal_matrix[0].xyz;
vec4 translate = normal_matrix[1];
vec3 pos_a = floor(pos_color);
vec3 rgb = 1.05 * (pos_color - pos_a);
float hidden = float(pos_a.x > EXTENT);
float color_mix = pos_a.z / 100.0;
v_color_mix = vec4(sRGBToLinear(rgb), color_mix);

float meter_to_tile = normal_matrix[0].w;
vec4 pos = vec4(pos_a.xy, translate.z, 1.0); //模型局部空间的顶点坐标

rs[0].x = normal_matrix[1].w;
rs[0].yz = normal_matrix[2].xy;
rs[1].xy = normal_matrix[2].zw;
rs[1].z = normal_matrix[3].x;
rs[2].xyz = normal_matrix[3].yzw;

vec4 pos_node = u_lighting_matrix * vec4(a_pos_3f, 1.0);
vec3 rotated_pos_node = rs * pos_node.xyz;
// 如果style里有设置translate偏移的话  把xy单位转换为瓦片单位，再进行缩放
vec3 pos_model_tile = (rotated_pos_node + vec3(translate.xy, 0.0)) * vec3(meter_to_tile, meter_to_tile, 1.0);

pos.xyz += pos_model_tile;
local_pos = pos.xyz;

gl_Position = mix(u_matrix * pos, AWAY, hidden);
pos.z *= meter_to_tile;
v_position_height.xyz = pos.xyz - u_camera_pos;