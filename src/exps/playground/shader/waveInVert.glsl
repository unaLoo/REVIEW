#ifdef VERTEX_SHADER

layout(location = 0) in vec4 a_position;

uniform mat4 u_model_mat;
uniform mat4 u_view_mat;
uniform mat4 u_proj_mat;
uniform float iTime; // in seconds

out vec3 v_world_pos;
out vec3 v_normal;

vec2 wavedx(vec2 position, vec2 direction, float frequency, float timeshift) {
  float x = dot(position, direction) * frequency + timeshift;
  float wave = exp(sin(x) - 1.0);
  float dx = wave * cos(x);
  return vec2(wave, -dx);
}

// 将多个不同尺度、频率的波形(octaves)叠加求和，计算水体波浪高度
float calcWave(vec2 position, int iterations) {
  float wavePhaseShift = length(position) * 0.2; // this is to avoid every octave having exactly the same phase everywhere
  float iter = 0.0; // this will help generating well distributed wave directions
  float frequency = 1.0; // frequency of the wave, this will change every iteration
  float timeMultiplier = 2.0; // time multiplier for the wave, this will change every iteration
  float weight = 1.0;// weight in final sum for the wave, this will change every iteration
  float sumOfValues = 0.0; // will store final sum of values
  float sumOfWeights = 0.0; // will store final sum of weights
  const float DRAG_MULT = 0.38; // drag multiplier for the wave, this will change every iteration
  for(int i = 0; i < iterations; i++) {
    // generate some wave direction that looks kind of random
    vec2 p = vec2(sin(iter), cos(iter));

    // calculate wave data
    vec2 res = wavedx(position, p, frequency, iTime * timeMultiplier + wavePhaseShift);

    // shift position around according to wave drag and derivative of the wave

    position += p * res.y * weight * DRAG_MULT;

    // add the results to sums
    sumOfValues += res.x * weight;
    sumOfWeights += weight;

    // modify next octave ;
    weight = mix(weight, 0.0, 0.2);
    frequency *= 1.18;
    timeMultiplier *= 1.07;

    // add some kind of random value to make next wave look random too
    iter += 1232.399963;
  }
    // calculate and return
  return sumOfValues / sumOfWeights;
}

void main() {
  const int iterations = 10; // number of iterations for wave calculation
  const float waterDepth = 0.5; // depth of the water
  mat4 mvpMat = u_proj_mat * u_view_mat * u_model_mat;

  // float wave = calcWave(a_position.xy * 5.0, iterations); // calculate wave height for this vertex
  // vec4 pos = vec4(a_position.xy, a_position.z + wave, 1.0); // set position to vertex position with wave height

  // calc normal 

  /// main pos wave
  vec3 pos = a_position.xyz;
  vec2 scaledPos = pos.xy * 3.0; // scale position to make it more visible
  float height = calcWave(scaledPos, iterations) * waterDepth; // (0 -> depth)
  vec3 wavePosMain = vec3(scaledPos, height);

    /////////////////// in the plane of xy
    // |  --   | oPos2 |  --  | 
    // | oPos1 |  Mpos |  --  |
    // |  --   |  ---  |  --  |
    //////////////////
  const vec2 offset = vec2(0.01, 0.0); // offset for the second wave position 
  vec3 offsetPos1 = vec3(scaledPos - offset.xy, 0.0);
  vec3 offsetPos2 = vec3(scaledPos + offset.yx, 0.0);

  float height1 = calcWave(offsetPos1.xy, iterations) * waterDepth;
  float height2 = calcWave(offsetPos2.xy, iterations) * waterDepth;

  vec3 wavePos1 = vec3(offsetPos1.xy, height1);
  vec3 wavePos2 = vec3(offsetPos2.xy, height2);

  vec3 normal = normalize(cross(wavePos2 - wavePosMain, wavePos1 - wavePosMain));

  vec4 vertPos = vec4(a_position.xy, wavePosMain.z, 1.0);

  gl_Position = mvpMat * vertPos;
  v_world_pos = (u_model_mat * vertPos).xyz;
  v_normal = normal;

}

#endif
#ifdef FRAGMENT_SHADER

precision highp float;

in vec3 v_world_pos;
in vec3 v_normal;

uniform vec3 u_lightPos;
uniform vec3 u_light_color;
uniform vec3 u_camera_pos;

out vec4 fragColor;

void main() {

  vec3 ambient = vec3(0, 30, 76) / 255.0;

  vec3 lightDir = normalize(u_lightPos - v_world_pos);
  vec3 viewDir = normalize(u_camera_pos - v_world_pos);

  float diff = max(dot(lightDir, v_normal), 0.0);
  vec3 diffuse = diff * u_light_color / 255.0;

  vec3 reflectDir = reflect(-lightDir, v_normal);
  float spec = pow(max(dot(viewDir, reflectDir), 0.0), 64.0);
  vec3 specular = spec * u_light_color / 255.0 * 0.1;

  vec3 result = (ambient + diffuse + specular) * 1.0;

  fragColor = vec4(v_normal, 0.5);

}

#endif