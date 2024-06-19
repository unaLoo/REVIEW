
const canvas = document.querySelector('canvas');
const gl = canvas.getContext('webgl2');

const genPointsVSGLSL = `#version 300 es
uniform int numPoints;
out vec2 position;
out vec4 color;

#define PI radians(180.0)

void main() {
    float u = float(gl_VertexID) / float(numPoints);
    float a = u * PI * 2.0;
    position = vec2(cos(a), sin(a)) * 0.8;
    color = vec4(u, 0, 1.0 - u, 1);
}
`;

const genPointsFSGLSL = `#version 300 es
void main() {
  discard;
}
`;

const drawVSGLSL = `#version 300 es
in vec4 position;
in vec4 color;

out vec4 v_color;

void main() {
  gl_PointSize = 20.0;
  gl_Position = position;
  v_color = color;
}
`;

const drawFSGLSL = `#version 300 es
precision highp float;

in vec4 v_color;

out vec4 outColor;

void main() {
    outColor = v_color;
}
`;

const createShader = function(gl, type, glsl) {
  const shader = gl.createShader(type)
  gl.shaderSource(shader, glsl)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(shader))
  }
  return shader
};

const createProgram = function(gl, vsGLSL, fsGLSL, outVaryings) {
  const vs = createShader(gl, gl.VERTEX_SHADER, vsGLSL)
  const fs = createShader(gl, gl.FRAGMENT_SHADER, fsGLSL)
  const prg = gl.createProgram()
  gl.attachShader(prg, vs)
  gl.attachShader(prg, fs)
  if (outVaryings) {
    gl.transformFeedbackVaryings(prg, outVaryings, gl.SEPARATE_ATTRIBS)
  }
  gl.linkProgram(prg)
  if (!gl.getProgramParameter(prg, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(prg))
  }

  // NOTE! These are only here to unclutter the diagram.
  // It is safe to detach and delete shaders once
  // a program is linked though it is arguably not common.
  // and I usually don't do it.
  gl.detachShader(prg, vs)
  gl.deleteShader(vs)
  gl.detachShader(prg, fs)
  gl.deleteShader(fs)

  return prg
};

const genProg = createProgram(gl, genPointsVSGLSL, genPointsFSGLSL, ['position', 'color']);
const drawProg = createProgram(gl, drawVSGLSL, drawFSGLSL);

const numPointsLoc = gl.getUniformLocation(genProg, 'numPoints');

const posLoc = gl.getAttribLocation(drawProg, 'position');
const colorLoc = gl.getAttribLocation(drawProg, 'color');

const numPoints = 24;

// make a vertex array and attach 2 buffers
// one for 2D positions, 1 for colors.
const dotVertexArray = gl.createVertexArray();
gl.bindVertexArray(dotVertexArray);

const positionBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
gl.bufferData(gl.ARRAY_BUFFER, numPoints * 2 * 4, gl.DYNAMIC_DRAW);
gl.enableVertexAttribArray(posLoc);
gl.vertexAttribPointer(
    posLoc,       // location
    2,            // size (components per iteration)
    gl.FLOAT,     // type of to get from buffer
    false,        // normalize
    0,            // stride (bytes to advance each iteration)
    0,            // offset (bytes from start of buffer)
);

const colorBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
gl.bufferData(gl.ARRAY_BUFFER, numPoints * 4 * 4, gl.DYNAMIC_DRAW);
gl.enableVertexAttribArray(colorLoc);
gl.vertexAttribPointer(
    colorLoc,   // location
    4,          // size (components per iteration)
    gl.FLOAT,   // type of to get from buffer
    false,      // normalize
    0,          // stride (bytes to advance each iteration)
    0,          // offset (bytes from start of buffer)
);

// This is not really needed but if we end up binding anything
// to ELEMENT_ARRAY_BUFFER, say we are generating indexed geometry
// we'll change cubeVertexArray's ELEMENT_ARRAY_BUFFER. By binding
// null here that won't happen.
gl.bindVertexArray(null);

// setup a transform feedback object to write to
// the position and color buffers
const tf = gl.createTransformFeedback();
gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, tf);
gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, positionBuffer);
gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 1, colorBuffer);
gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, null);

// above this line is initialization code
// --------------------------------------
// below is rendering code.

// --------------------------------------
// First compute points into buffers

// no need to call the fragment shader
gl.enable(gl.RASTERIZER_DISCARD);

// unbind the buffers so we don't get errors.
gl.bindBuffer(gl.TRANSFORM_FEEDBACK_BUFFER, null);
gl.bindBuffer(gl.ARRAY_BUFFER, null);

gl.useProgram(genProg);

// generate numPoints of positions and colors
// into the buffers
gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, tf);
gl.beginTransformFeedback(gl.POINTS);
gl.uniform1i(numPointsLoc, numPoints);
gl.drawArrays(gl.POINTS, 0, numPoints);
gl.endTransformFeedback();
gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, null);

// turn on using fragment shaders again
gl.disable(gl.RASTERIZER_DISCARD);

// --------------------------------------
// Now draw using the buffers we just computed

gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

gl.bindVertexArray(dotVertexArray);
gl.useProgram(drawProg);
gl.drawArrays(gl.POINTS, 0, numPoints);